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
import {IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {Aggregate as SchedulingAggregate, IHttpPostClient, ILocks, IRepo} from "@mojaloop/scheduling-bc-domain-lib";
import {SchedulingCommandHandler} from "./handler";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {MLKafkaJsonProducerOptions,MLKafkaJsonConsumer,MLKafkaJsonConsumerOptions,MLKafkaJsonProducer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {
 AuditClient,
 KafkaAuditClientDispatcher,
 LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import configClient from "./config";
import {FetchPostClient, MongoRepo, RedisLocks} from "@mojaloop/scheduling-bc-implementations-lib";

const BC_NAME = configClient.boundedContextName;
const APP_NAME = configClient.applicationName;
const APP_VERSION = configClient.applicationVersion;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";
const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

// Locks.
const HOST_LOCKS: string = process.env.SCHEDULING_HOST_LOCKS ?? "localhost";
const MAX_LOCK_SPINS = 10; // Max number of attempts to acquire a lock. TODO.
const CLOCK_DRIFT_FACTOR = 0.01;

// Time.
const TIME_ZONE = "UTC";
const TIMEOUT_MS_REPO_OPERATIONS = 10_000; // TODO.
const DELAY_MS_LOCK_SPINS = 200; // Time between acquire attempts. TODO.
const DELAY_MS_LOCK_SPINS_JITTER = 200; // TODO.
const THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION = 500; // TODO.
const TIMEOUT_MS_LOCK_ACQUIRED = 30_000; // TODO.
const MIN_DURATION_MS_TASK = 2_000; // TODO.
const TIMEOUT_MS_HTTP_CLIENT = 10_000; // TODO.

//Oracles
const DB_NAME = process.env.SCHEDULING_DB_NAME ?? "scheduling";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

const kafkaProducerOptions: MLKafkaJsonProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

let globalLogger:ILogger;

export class Service {
 static logger:ILogger;
 static auditClient: IAuditClient;
 static messageConsumer: IMessageConsumer;
 static messageProducer: IMessageProducer;
 static aggregate: SchedulingAggregate;
 static handler: SchedulingCommandHandler;
 static repo: IRepo;
 static locks: ILocks;
 static httpPostClient: IHttpPostClient;

 static async start(
     logger?:ILogger,
     auditClient?:IAuditClient,
     messageConsumer?:IMessageConsumer,
     messageProducer?: IMessageProducer,
     repo?:IRepo,
     locks?: ILocks,
     httpPostClient?: IHttpPostClient
 ){
  console.log(`Service starting with PID: ${process.pid}`);

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

  if(!messageConsumer){
      messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, logger);
  }
  this.messageConsumer = messageConsumer;

  if(!messageProducer){
      messageProducer = new MLKafkaJsonProducer(kafkaProducerOptions,logger);
      await messageProducer.connect();
  }
  this.messageProducer = messageProducer;

  if(!repo){
      repo = new MongoRepo(logger,MONGO_URL, DB_NAME, TIMEOUT_MS_REPO_OPERATIONS);
  }
  this.repo = repo;

  if(!locks){
      locks = new RedisLocks(
          logger,
          HOST_LOCKS,
          CLOCK_DRIFT_FACTOR,
          MAX_LOCK_SPINS,
          DELAY_MS_LOCK_SPINS,
          DELAY_MS_LOCK_SPINS_JITTER,
          THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION
      );
      await locks.init();
  }
  this.locks = locks;

  if(!httpPostClient){
      httpPostClient = new FetchPostClient(logger);
  }
  this.httpPostClient = httpPostClient;

  this.aggregate = new SchedulingAggregate(
      this.logger,
      this.repo,
      this.locks,
      this.httpPostClient,
      this.messageProducer,
      TIME_ZONE,
      TIMEOUT_MS_LOCK_ACQUIRED,
      MIN_DURATION_MS_TASK,
      TIMEOUT_MS_HTTP_CLIENT
  );

  // create handler and start it
  this.handler = new SchedulingCommandHandler(
      this.logger,
      this.auditClient,
      this.messageConsumer,
      this.aggregate
  );
  await this.handler.start();

  this.logger.info(`Scheduling Command Handler Service started, version: ${configClient.applicationVersion}`);
 }
 static async stop(): Promise<void> {
    this.logger.debug("Tearing down command handler");
    if(this.handler) await this.handler.stop();
    this.logger.debug("Tearing down aggregate");
    if(this.aggregate) await this.aggregate.destroy();
    this.logger.debug("Tearing down message producer");
    if(this.messageProducer) await this.messageProducer.destroy();
    this.logger.debug("Tearing down message consumer");
    if (this.messageConsumer) await this.messageConsumer.destroy(true);
    this.logger.debug("Destroying HTTP Post Client");
    if(this.httpPostClient) await this.httpPostClient.destroy();
    this.logger.debug("Tearing down audit Client");
    if (this.auditClient) await this.auditClient.destroy();
    this.logger.debug("Tearing down logger");
    if (this.logger && this.logger instanceof KafkaLogger) await this.logger.destroy();
    }

}

/**
 * process termination and cleanup
 */

/* istanbul ignore next */
async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(() => {
        clean_exit || process.abort();
    }, 5000);

    // call graceful stop routine
    await Service.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on("exit", /* istanbul ignore next */async () => {
    globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", /* istanbul ignore next */(err: Error) => {
    globalLogger.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
