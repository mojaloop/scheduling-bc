/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Alfajiri
 - Elijah Okello <elijahokello90@gmail.com>

 --------------
 ******/

"use strict";

import {existsSync} from "fs";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IMessageConsumer,IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {Aggregate as SchedulingAggregate} from "@mojaloop/scheduling-bc-domain-lib";
import {SchedulingCommandHandler} from "./handler";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {MLKafkaJsonProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {
 ITokenHelper,
 ILoginHelper,
 IAuthorizationClient,
} from "@mojaloop/security-bc-public-types-lib";
import {TokenHelper,LoginHelper} from "@mojaloop/security-bc-client-lib"
import {
 AuditClient,
 KafkaAuditClientDispatcher,
 LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import configClient from "./config";

const BC_NAME = configClient.boundedContextName;
const APP_NAME = configClient.applicationName;
const APP_VERSION = configClient.applicationVersion;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:example@localhost:27017/";

const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";
const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix

const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "http://localhost:3201/";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.default_audience";
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;

const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "scheduling-bc-command-handler-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const kafkaProducerOptions: MLKafkaJsonProducerOptions = {
 kafkaBrokerList: KAFKA_URL
};

let globalLogger:ILogger;

export class Service {
 static logger:ILogger;
 static tokenHelper: ITokenHelper;
 static loginHelper: ILoginHelper;
 static authorizationClient: IAuthorizationClient;
 static auditClient: IAuditClient;
 static messageConsumer: IMessageConsumer;
 static messageProducer: IMessageProducer;
 static aggregate: SchedulingAggregate;
 static handler: SchedulingCommandHandler;

 static async start(
     logger?:ILogger,
     tokenHelper?:ITokenHelper,
     loginHelper?:ILoginHelper,
     authorizationClient?:IAuthorizationClient,
     auditClient?:IAuditClient,
     messageConsumer?:IMessageConsumer,
     messageProducer?:IMessageProducer,
     aggregate?:SchedulingAggregate,
     handler?:SchedulingCommandHandler
 ){
  console.log(`Service starting with PID: ${process.pid}`);

  // Config Client ?

  if (!logger) {
   logger = new KafkaLogger(
       BC_NAME,
       APP_NAME,
       APP_VERSION,
       kafkaProducerOptions,
       KAFKA_LOGS_TOPIC,
       LOG_LEVEL
   );
   await (logger as KafkaLogger).init();
  }
  globalLogger = this.logger = logger;

  if(!aggregate){
   // aggregate = new SchedulingAggregate(logger,);// TODO Create Aggregate. Were I left off
  }
  // this.aggregate = aggregate
  if (!tokenHelper) {
   tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
   await tokenHelper.init();
  }
  this.tokenHelper = tokenHelper;

  if(!loginHelper){
   loginHelper = new LoginHelper(AUTH_N_SVC_TOKEN_URL, this.logger);
   (loginHelper as LoginHelper).setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);
  }
  this.loginHelper = loginHelper;

  // // authorization client TODO
  // if (!authorizationClient) {
  //  // setup privileges - bootstrap app privs and get priv/role associations
  //  authorizationClient = new AuthorizationClient(
  //      BC_NAME, APP_NAME, APP_VERSION, AUTH_Z_SVC_BASEURL, this.logger.createChild("AuthorizationClient")
  //  );
  //  addPrivileges(authorizationClient as AuthorizationClient);
  //  await (authorizationClient as AuthorizationClient).bootstrap(true);
  //  await (authorizationClient as AuthorizationClient).fetch();
  //
  // }
  // this.authorizationClient = authorizationClient;

  if (!auditClient) {
   if (!existsSync(AUDIT_KEY_FILE_PATH)) {
    if (PRODUCTION_MODE) process.exit(9);
    // create e tmp file
    LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
   }
   const auditLogger = this.logger.createChild("auditDispatcher");
   auditLogger.setLogLevel(LogLevel.INFO);

   const cryptoProvider = new LocalAuditClientCryptoProvider(
       AUDIT_KEY_FILE_PATH
   );
   const auditDispatcher = new KafkaAuditClientDispatcher(
       kafkaProducerOptions,
       KAFKA_AUDITS_TOPIC,
       auditLogger
   );
   // NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialised already
   auditClient = new AuditClient(
       BC_NAME,
       APP_NAME,
       APP_VERSION,
       cryptoProvider,
       auditDispatcher
   );
   await auditClient.init();
  }
  this.auditClient = auditClient;
 }
}
