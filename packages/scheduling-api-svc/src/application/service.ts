/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import { TRANSFERS_BOUNDED_CONTEXT_NAME } from "@mojaloop/platform-shared-lib-public-messages-lib";
//TODO re-enable configs
//import appConfigs from "./config";
import {
	Aggregate, IHttpPostClient, ILocks, IRepo,
} from "@mojaloop/scheduling-bc-domain-lib";
// import { AuditClient, KafkaAuditClientDispatcher, LocalAuditClientCryptoProvider } from "@mojaloop/auditing-bc-client-lib";
// import {
// 	AuthenticatedHttpRequester,
// 	AuthorizationClient,
// 	IAuthenticatedHttpRequester,
// 	LoginHelper,
// 	TokenHelper
// } from "@mojaloop/security-bc-client-lib";
// import {IAuthorizationClient, ILoginHelper} from "@mojaloop/security-bc-public-types-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    MLKafkaJsonConsumerOptions,
    MLKafkaJsonProducer,
    MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {FetchPostClient, MongoRepo, RedisLocks} from "@mojaloop/scheduling-bc-implementations-lib";
import express, { Express } from "express";

import { SchedulingExpressRoutes } from "./routes/scheduling_routes";
// import { IAuditClient } from "@mojaloop/auditing-bc-public-types-lib";
// import { IMetrics } from "@mojaloop/platform-shared-lib-observability-types-lib";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
// import { PrometheusMetrics } from "@mojaloop/platform-shared-lib-observability-client-lib";
import { Server } from "net";
// import { existsSync } from "fs";
import process from "process";
import {
	// AuthorizationClient,
	TokenHelper
} from "@mojaloop/security-bc-client-lib";
import { IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";
import crypto from "crypto";

// Global vars
const BC_NAME = "scheduling-bc";
const APP_NAME = "scheduling-api-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.0";
// const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const INSTANCE_NAME = `${BC_NAME}_${APP_NAME}`;
const INSTANCE_ID = `${INSTANCE_NAME}__${crypto.randomUUID()}`;

// Logger
// service constants
// const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

// Message Consumer/Publisher
// Message Consumer/Publisher
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_AUTH_ENABLED = process.env["KAFKA_AUTH_ENABLED"] && process.env["KAFKA_AUTH_ENABLED"].toUpperCase()==="TRUE" || false;
const KAFKA_AUTH_PROTOCOL = process.env["KAFKA_AUTH_PROTOCOL"] || "sasl_plaintext";
const KAFKA_AUTH_MECHANISM = process.env["KAFKA_AUTH_MECHANISM"] || "plain";
const KAFKA_AUTH_USERNAME = process.env["KAFKA_AUTH_USERNAME"] || "user";
const KAFKA_AUTH_PASSWORD = process.env["KAFKA_AUTH_PASSWORD"] || "password";

//const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

//Oracles
const DB_NAME = process.env.SCHEDULING_DB_NAME ?? "scheduling";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

// Express Server
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3150;

// Auth Requester
// const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "scheduling-bc-scheduling-api-svc";
// const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

// const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
// const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix

// // Token
// const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
// const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
// const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";

// security
const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
// const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";
const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;
// const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

// // Audit
// const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";
// const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";

// //Authorization
// const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

// kafka common options
const kafkaProducerCommonOptions:MLKafkaJsonProducerOptions = {
    kafkaBrokerList: KAFKA_URL,
    producerClientId: `${INSTANCE_ID}`,
};
const kafkaConsumerCommonOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL
};
if(KAFKA_AUTH_ENABLED){
    kafkaProducerCommonOptions.authentication = kafkaConsumerCommonOptions.authentication = {
        protocol: KAFKA_AUTH_PROTOCOL as "plaintext" | "ssl" | "sasl_plaintext" | "sasl_ssl",
        mechanism: KAFKA_AUTH_MECHANISM as "PLAIN" | "GSSAPI" | "SCRAM-SHA-256" | "SCRAM-SHA-512",
        username: KAFKA_AUTH_USERNAME,
        password: KAFKA_AUTH_PASSWORD
    };
}

const producerOptions: MLKafkaJsonProducerOptions = {
    ...kafkaProducerCommonOptions,
    producerClientId: `${INSTANCE_ID}`,
};

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
// const TIMEOUT_MS_EVENT = 10_000; // TODO.

const SERVICE_START_TIMEOUT_MS= (process.env["SERVICE_START_TIMEOUT_MS"] && parseInt(process.env["SERVICE_START_TIMEOUT_MS"])) || 60_000;

// kafka logger
export class Service {
	static aggregate: Aggregate;
	static app: Express;
	static schedulingRepo: IRepo;
	static expressServer: Server;
	static logger: ILogger;
	static messageProducer: IMessageProducer;
	static tokenHelper: ITokenHelper;
    static authorizationClient: IAuthorizationClient;
	static locks: ILocks;
	static httpPostClient: IHttpPostClient;
    static startupTimer: NodeJS.Timeout;

	static async start(
		schedulingRepo?: IRepo,
		tokenHelper?: ITokenHelper,
		logger?: ILogger,
		messageProducer?: IMessageProducer,
        authorizationClient?: IAuthorizationClient,
		locks?: ILocks,
		httpPostClient?:IHttpPostClient
	): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);


		// istanbul ignore next
		if (!logger) {
			logger = new KafkaLogger(
				TRANSFERS_BOUNDED_CONTEXT_NAME,
				APP_NAME,
				APP_VERSION,
				kafkaProducerOptions,
				KAFKA_LOGS_TOPIC,
				LOG_LEVEL
			);
			await (logger as KafkaLogger).init();
		}
		globalLogger = this.logger = logger.createChild("Service");

		// // authorization client
		// if (!authorizationClient) {
		// 	// setup privileges - bootstrap app privs and get priv/role associations
		// 	authorizationClient = new AuthorizationClient(BC_NAME, APP_NAME, APP_VERSION, AUTH_Z_SVC_BASEURL, logger);
		// 	// authorizationClient.addPrivilegesArray(SchedulingPrivilegesDefinition);
		// 	await (authorizationClient as AuthorizationClient).bootstrap(true);
		// 	await (authorizationClient as AuthorizationClient).fetch();
		// }
		// this.authorizationClient = authorizationClient;

		// token helper
		// istanbul ignore next
		if(!tokenHelper){
            tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
            await tokenHelper.init();
		}
		this.tokenHelper = tokenHelper;

		// istanbul ignore next
		if (!schedulingRepo) {
			schedulingRepo = new MongoRepo(this.logger, MONGO_URL, DB_NAME, TIMEOUT_MS_REPO_OPERATIONS);
            await schedulingRepo.init();
		}
		this.schedulingRepo = schedulingRepo;

		// istanbul ignore next
		if (!locks) {
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

		// istanbul ignore next
		if (!messageProducer) {
			const producerLogger = logger.createChild("producerLogger");
			producerLogger.setLogLevel(LogLevel.INFO);
			messageProducer = new MLKafkaJsonProducer(producerOptions, producerLogger);
			await messageProducer.connect();
		}
		this.messageProducer = messageProducer;

		if(!httpPostClient){
			httpPostClient = new FetchPostClient(logger);
		}
		this.httpPostClient = httpPostClient;


		// all inits done
		logger.info("Kafka Consumer Initialized");

		await this.messageProducer.connect();

		this.logger.info("Kafka Producer Initialized");

		this.aggregate = new Aggregate(
			this.logger,
			this.schedulingRepo,
			this.locks,
			this.httpPostClient,
			this.messageProducer,
			TIME_ZONE,
			TIMEOUT_MS_LOCK_ACQUIRED,
			MIN_DURATION_MS_TASK,
			TIMEOUT_MS_HTTP_CLIENT
		);

		await this.aggregate.init();

		await this.setupAndStartExpress();

		this.logger.info("Aggregate Initialized");

        // remove startup timeout
        clearTimeout(this.startupTimer);
	}


	static async setupAndStartExpress(): Promise<void> {
		return new Promise<void>(resolve => {
			// Start express server
			this.app = express();
			this.app.use(express.json()); // for parsing application/json
			this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

			// Add client http routes
			const schedulingClientRoutes = new SchedulingExpressRoutes(
                this.logger,
                this.aggregate,
                this.tokenHelper as TokenHelper,
                this.authorizationClient,
                this.messageProducer,
                this.schedulingRepo
            );
			this.app.use("/reminders", schedulingClientRoutes.mainRouter);

			// Add health and metrics http routes
			this.app.get("/health", (req: express.Request, res: express.Response) => {
                return res.send({ status: "OK" });
            });

			this.app.use((req, res) => {
				// catch all
				res.send(404);
			});

			this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
				this.logger.info(`🚀 Server ready on port ${SVC_DEFAULT_HTTP_PORT}`);
				this.logger.info(`Scheduling server v: ${APP_VERSION} started`);

				resolve();
			});
		});
	}

	static async stop(): Promise<void> {
		this.logger.debug("Tearing down aggregate");
		await this.aggregate.destroy();
		this.logger.debug("Tearing down message producer");
		await this.messageProducer.destroy();
        this.logger.debug("Destroying HTTP Post Client");
        await this.httpPostClient.destroy();
		const expressServerCloseProm = new Promise<void>((resolve, reject)=>{
			this.expressServer.close((err)=>{
				if(err){
					return reject(err);
				}
				resolve();
			});
		});
		this.logger.debug("Tearing down express server");
		await expressServerCloseProm;
	}

}

const kafkaProducerOptions = {
	kafkaBrokerList: KAFKA_URL
};

let globalLogger: ILogger;

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

