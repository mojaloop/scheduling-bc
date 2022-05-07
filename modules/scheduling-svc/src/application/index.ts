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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

/* eslint-disable @typescript-eslint/no-inferrable-types */

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import express from "express";
import {SchedulingAggregate} from "../domain/scheduling_aggregate";
import {MongoDBSchedulingRepository} from "../infrastructure/mongodb_scheduling_repository";
import {RedisSchedulingLocks} from "../infrastructure/redis_scheduling_locks";
import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {ISchedulingLocks} from "../domain/ischeduling_locks";
import {MLKafkaProducer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {AxiosSchedulingHTTPClient} from "../infrastructure/axios_http_client";
import {ExpressRoutes} from "./express_routes";
import {ISchedulingHTTPClient} from "../domain/ischeduling_http_client";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";

/* Constants. */
const NAME_SERVICE: string = "scheduling";
// Server.
const HOST_SERVER: string = process.env.SCHEDULER_HOST_SERVER || "localhost";
const PORT_NO_SERVER = process.env.SCHEDULER_PORT_NO_SERVER || "1234"; // TODO: type.
const URL_SERVER_BASE: string = `http://${HOST_SERVER}:${PORT_NO_SERVER}`;
const URL_SERVER_PATH_REMINDERS: string = "/reminders";
// Repository.
const HOST_REPO: string = process.env.SCHEDULER_HOST_REPO || "localhost";
const PORT_NO_REPO = process.env.SCHEDULER_PORT_NO_REPO || 27017; // TODO: type.
const URL_REPO: string = `mongodb://${HOST_REPO}:${PORT_NO_REPO}`;
const NAME_DB: string = "scheduling";
const NAME_COLLECTION: string = "reminders";
// Locks.
const HOST_LOCKS: string = process.env.SCHEDULER_HOST_LOCKS || "localhost";
const MAX_LOCK_SPINS: number = 10; // Max number of attempts to acquire a lock. TODO.
const CLOCK_DRIFT_FACTOR: number = 0.01;
// Message producer.
const HOST_MESSAGE_BROKER: string = process.env.SCHEDULER_HOST_MESSAGE_BROKER || "localhost";
const PORT_NO_MESSAGE_BROKER = process.env.SCHEDULER_PORT_NO_MESSAGE_BROKER || 9092; // TODO: type.
const URL_MESSAGE_BROKER: string = `${HOST_MESSAGE_BROKER}:${PORT_NO_MESSAGE_BROKER}`; // TODO: name.
const ID_MESSAGE_PRODUCER: string = NAME_SERVICE; // TODO: name.
// Time.
const TIME_ZONE: string = "UTC";
const TIMEOUT_MS_REPO_OPERATIONS: number = 10_000; // TODO.
const DELAY_MS_LOCK_SPINS: number = 200; // Time between acquire attempts. TODO.
const DELAY_MS_LOCK_SPINS_JITTER: number = 200; // TODO.
const THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION: number = 500; // TODO.
const TIMEOUT_MS_LOCK_ACQUIRED: number = 30_000; // TODO.
const MIN_DURATION_MS_TASK: number = 2_000; // TODO.
const TIMEOUT_MS_HTTP_REQUEST: number = 10_000; // TODO.
const TIMEOUT_MS_EVENT: number = 10_000; // TODO.

// Logger.
const logger: ILogger = new ConsoleLogger();
// Infrastructure.
const schedulingRepository: ISchedulingRepository = new MongoDBSchedulingRepository(
    logger,
    URL_REPO,
    NAME_DB,
    NAME_COLLECTION,
    TIMEOUT_MS_REPO_OPERATIONS
);
const schedulingLocks: ISchedulingLocks = new RedisSchedulingLocks(
    logger,
    HOST_LOCKS,
    CLOCK_DRIFT_FACTOR,
    MAX_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS_JITTER,
    THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION
);
// Domain.
const httpClient: ISchedulingHTTPClient = new AxiosSchedulingHTTPClient(logger, TIMEOUT_MS_HTTP_REQUEST);
const messageProducer: IMessageProducer = new MLKafkaProducer({ // TODO: type; timeout. AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
    kafkaBrokerList: URL_MESSAGE_BROKER,
    producerClientId: ID_MESSAGE_PRODUCER
}, logger);
const schedulingAggregate: SchedulingAggregate = new SchedulingAggregate( // TODO: interface?
    logger,
    schedulingRepository,
    schedulingLocks,
    httpClient,
    messageProducer,
    TIME_ZONE,
    TIMEOUT_MS_LOCK_ACQUIRED,
    MIN_DURATION_MS_TASK
);
// Express.
const app: express.Express = express(); // TODO: type.
const routes: ExpressRoutes = new ExpressRoutes( // TODO: interface?
    logger,
    schedulingAggregate
);

function setUpExpress() {
    app.use(express.json()); // For parsing application/json.
    app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
    app.use(URL_SERVER_PATH_REMINDERS, routes.router);
}

async function start(): Promise<void> {
    await schedulingAggregate.init(); // The aggregate initializes all the dependencies.
    setUpExpress();
    app.listen(PORT_NO_SERVER, () => {
        logger.info("Server on.");
        logger.info(`Host: ${HOST_SERVER}`);
        logger.info(`Port: ${PORT_NO_SERVER}`);
        logger.info(`Base URL: ${URL_SERVER_BASE}`);
    });
}

async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
    logger.info(`${NAME_SERVICE} - ${signal} received, cleaning up...`);
    await schedulingAggregate.terminate(); // The aggregate terminates all the dependencies. TODO: just here?
    process.exit();
}

// SIGINT (Ctrl + c).
process.on("SIGINT", handleIntAndTermSignals.bind(this));
// SIGTERM.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
// Exit.
process.on("exit", () => {
    logger.info(`${NAME_SERVICE} - exiting...`);
});

start();
