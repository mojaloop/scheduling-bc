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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import express from "express";
import {SchedulingAggregate} from "../domain/scheduling_aggregate";
import {Reminder} from "../domain/types";
import {MongoDBSchedulingRepository} from "../infrastructure/mongodb_scheduling_repository";
import {RedisSchedulingLocks} from "../infrastructure/redis_scheduling_locks";
import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {ISchedulingLocks} from "../domain/ischeduling_locks";
import {MLKafkaProducer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {
    InvalidReminderIdTypeError,
    InvalidReminderTaskDetailsTypeError,
    InvalidReminderTaskTypeError, InvalidReminderTaskTypeTypeError, InvalidReminderTimeError,
    InvalidReminderTimeTypeError, MissingReminderPropertiesOrTaskDetailsError,
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "../domain/errors";
import {AxiosSchedulingHTTPClient} from "../infrastructure/axios_http_client";

/* Constants. */
const NAME_SERVICE = "scheduling";
// Server.
const HOST_SERVER = process.env.SCHEDULER_HOST_SERVER || "localhost";
const PORT_NO_SERVER = process.env.SCHEDULER_PORT_NO_SERVER || 1234;
const URL_SERVER_BASE = `http://${HOST_SERVER}:${PORT_NO_SERVER}`;
const URL_SERVER_PATH_REMINDERS = "/reminders";
// Repository.
const HOST_REPO = process.env.SCHEDULER_HOST_REPO || "localhost";
const PORT_NO_REPO = process.env.SCHEDULER_PORT_NO_REPO || 27017;
const URL_REPO = `mongodb://${HOST_REPO}:${PORT_NO_REPO}`;
const NAME_DB = "scheduling";
const NAME_COLLECTION = "reminders";
// Locks.
const HOST_LOCKS = process.env.SCHEDULER_HOST_LOCKS || "localhost";
const MAX_LOCK_SPINS = 10; // Max number of attempts to acquire a lock. TODO.
const CLOCK_DRIFT_FACTOR = 0.01;
// Message producer.
const HOST_MESSAGE_BROKER = process.env.SCHEDULER_HOST_MESSAGE_BROKER || "localhost";
const PORT_NO_MESSAGE_BROKER = process.env.SCHEDULER_PORT_NO_MESSAGE_BROKER || 9092;
const URL_MESSAGE_BROKER = `${HOST_MESSAGE_BROKER}:${PORT_NO_MESSAGE_BROKER}`; // TODO: name.
const ID_MESSAGE_PRODUCER = NAME_SERVICE; // TODO: name.
// Time.
const TIME_ZONE = "UTC";
const TIMEOUT_MS_REPO_OPERATIONS = 10_000; // TODO.
const DELAY_MS_LOCK_SPINS = 200; // Time between acquire attempts. TODO.
const DELAY_MS_LOCK_SPINS_JITTER = 200; // TODO.
const THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION = 500; // TODO.
const TIMEOUT_MS_LOCK_ACQUIRED = 30_000; // TODO.
const MIN_DURATION_MS_TASK = 2_000; // TODO.
const TIMEOUT_MS_HTTP_REQUEST = 10_000; // TODO.
const TIMEOUT_MS_EVENT = 10_000; // TODO.

// Logger.
const logger: ILogger = new ConsoleLogger();
// Express.
const app = express();
const router = express.Router();
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
const httpClient = new AxiosSchedulingHTTPClient(logger, TIMEOUT_MS_HTTP_REQUEST);
const messageProducer = new MLKafkaProducer({ // TODO: timeout.
    kafkaBrokerList: URL_MESSAGE_BROKER,
    producerClientId: ID_MESSAGE_PRODUCER
}, logger);
const schedulingAggregate: SchedulingAggregate = new SchedulingAggregate(
    logger,
    schedulingRepository,
    schedulingLocks,
    httpClient,
    messageProducer,
    TIME_ZONE,
    TIMEOUT_MS_LOCK_ACQUIRED,
    MIN_DURATION_MS_TASK
);

function setUpExpress() {
    app.use(express.json()); // For parsing application/json.
    app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
}

// TODO: response structure; status codes.
function setUpRoutes() {
    app.use(URL_SERVER_PATH_REMINDERS, router);
    router.post("/", async (req: express.Request, res: express.Response) => {
        try {
            validateBodyReminder(req.body);
            // If the id is undefined or null, change it to "".
            if (typeof req.body.id != "string") {
                req.body.id = "";
            }
            const reminderId: string = await schedulingAggregate.createReminder(req.body); // TODO: send the body directly?
            res.status(200).json({
                status: "ok",
                reminderId: reminderId
            });
        } catch (e: unknown) {
            if (e instanceof MissingReminderPropertiesOrTaskDetailsError) {
                sendError(
                    res,
                    400,
                    "missing reminder properties or task details");
            } else if (e instanceof InvalidReminderIdTypeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder id type");
            } else if (e instanceof InvalidReminderTimeTypeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder time type");
            } else if (e instanceof InvalidReminderTaskTypeTypeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder task type type");
            } else if (e instanceof InvalidReminderTaskDetailsTypeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder task details type");
            } else if (e instanceof InvalidReminderTimeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder time");
            } else if (e instanceof InvalidReminderTaskTypeError) {
                sendError(
                    res,
                    400,
                    "invalid reminder task type");
            } else if (e instanceof ReminderAlreadyExistsError) {
                sendError(
                    res,
                    400,
                    "reminder already exists");
            } else {
                sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    });
    router.delete("/:reminderId", async (req: express.Request, res: express.Response) => {
        try {
            await schedulingAggregate.deleteReminder(req.params.reminderId);
            res.status(200).json({
                status: "ok",
                message: "reminder deleted"
            });
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderError) {
                sendError(
                    res,
                    400,
                    "no such reminder");
            } else {
                sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    });
    router.delete("/", async (req: express.Request, res: express.Response) => {
        try {
            await schedulingAggregate.deleteReminders();
            res.status(200).json({
                status: "ok",
                message: "reminders deleted"
            });
        } catch (e: unknown) {
            sendError(
                res,
                500,
                "unknown error");
        }
    });
    router.get("/:reminderId", async (req: express.Request, res: express.Response) => {
        try {
            const reminder: Reminder = await schedulingAggregate.getReminder(req.params.reminderId);
            res.status(200).json({
                status: "ok",
                reminder: reminder
            });
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderError) {
                sendError(
                    res,
                    400,
                    "no such reminder");
            } else {
                sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    });
    router.get("/", async (req: express.Request, res: express.Response) => {
        try {
            const reminders: Reminder[] = await schedulingAggregate.getReminders();
            res.status(200).json({
                status: "ok",
                reminders: reminders
            });
        } catch (e: unknown) {
            sendError(
                res,
                500,
                "unknown error");
        }
    });
}

// TODO.
function validateBodyReminder(body: any): void { // TODO: ReqBody type.
    // Check if the essential properties are present.
    if (body.time === undefined
        || body.taskType === undefined
        || (body.httpPostTaskDetails?.url === undefined
            && body.eventTaskDetails?.topic === undefined)) {
        throw new MissingReminderPropertiesOrTaskDetailsError();
    }
    // id.
    if (body.id !== undefined
        && body.id !== null
        && typeof body.id != "string") {
        throw new InvalidReminderIdTypeError();
    }
    // time.
    if (typeof body.time != "string"
        && !(body.time instanceof Date)) { // TODO: does Date make sense?
        throw new InvalidReminderTimeTypeError();
    }
    // taskType.
    if (typeof body.taskType != "number") { // TODO: number? ReminderTaskType?
        throw new InvalidReminderTaskTypeTypeError();
    }
    // TaskDetails.
    if (typeof body.httpPostTaskDetails?.url != "string"
        && typeof body.eventTaskDetails?.topic != "string") {
        throw new InvalidReminderTaskDetailsTypeError();
    }
}

// TODO: response structure.
function sendError(res: express.Response, statusCode: number, message: string) {
    res.status(statusCode).json({
        status: "error",
        message: message
    });
}

async function start(): Promise<void> {
    await schedulingRepository.init();
    await schedulingAggregate.init();
    setUpExpress();
    setUpRoutes();
    app.listen(PORT_NO_SERVER, () => {
        logger.info("Server on.");
        logger.info(`Host: ${HOST_SERVER}`);
        logger.info(`Port: ${PORT_NO_SERVER}`);
        logger.info(`Base URL: ${URL_SERVER_BASE}`);
    });
}

async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
    logger.info(`${NAME_SERVICE} - ${signal} received, cleaning up...`);
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
