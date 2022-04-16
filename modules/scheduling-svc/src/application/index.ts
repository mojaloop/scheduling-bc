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
    InvalidReminderIdError,
    InvalidReminderTaskDetailsError,
    InvalidReminderTaskTypeError,
    InvalidReminderTimeError, MissingReminderPropertiesOrTaskDetailsError,
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "../domain/errors";

// TODO: why no types here?
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
// Message producer.
const HOST_MESSAGE_BROKER = process.env.SCHEDULER_HOST_MESSAGE_BROKER || "localhost";
const PORT_NO_MESSAGE_BROKER = process.env.SCHEDULER_PORT_NO_MESSAGE_BROKER || 9092;
const MESSAGE_BROKER_LIST = `${HOST_MESSAGE_BROKER}:${PORT_NO_MESSAGE_BROKER}`; // TODO: name.
const MESSAGE_PRODUCER_ID = NAME_SERVICE; // TODO: name.
// Time.
const TIME_ZONE = "UTC";
const TIMEOUT_MS_HTTP_REQUEST = 5_000; // TODO.
const TIMEOUT_MS_MESSAGE_PRODUCER = 5_000; // TODO.

// Logger.
const logger: ILogger = new ConsoleLogger();
// Express.
const app = express();
const router = express.Router();
// Infrastructure.
const schedulingRepository: ISchedulingRepository = new MongoDBSchedulingRepository(
    URL_REPO,
    NAME_DB,
    NAME_COLLECTION
);
const schedulingLocks: ISchedulingLocks = new RedisSchedulingLocks(
    HOST_LOCKS
);
// Domain.
const schedulingAggregate: SchedulingAggregate = new SchedulingAggregate(
    schedulingRepository,
    schedulingLocks,
    new MLKafkaProducer({
        kafkaBrokerList: MESSAGE_BROKER_LIST,
        producerClientId: MESSAGE_PRODUCER_ID
    }, logger),
    TIME_ZONE,
    TIMEOUT_MS_HTTP_REQUEST,
    TIMEOUT_MS_MESSAGE_PRODUCER
);

function setUpExpress() {
    app.use(express.json()); // For parsing application/json.
    app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
}

function setUpRoutes() {
    app.use(URL_SERVER_PATH_REMINDERS, router);
    router.post("/", async (req: express.Request, res: express.Response) => {
        try {
            const reminderId: string = await schedulingAggregate.createReminder(req.body);
            res.status(200).json({
                status: "ok", // TODO: ""?
                reminderId: reminderId // TODO: why not purple?
            });
        } catch (e: any) { // TODO: any or Error?
            if (e instanceof MissingReminderPropertiesOrTaskDetailsError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "missing reminder properties or task details"
                });
            } else if (e instanceof InvalidReminderIdError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "invalid reminder id"
                });
            } else if (e instanceof InvalidReminderTimeError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "invalid reminder time"
                });
            } else if (e instanceof InvalidReminderTaskTypeError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "invalid reminder task type"
                });
            } else if (e instanceof InvalidReminderTaskDetailsError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "invalid reminder task details"
                });
            } else if (e instanceof ReminderAlreadyExistsError) {
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "reminder already exists"
                }); // TODO.
            } else {
                res.status(500).json({
                    status: "error",
                    message: "unknown error"
                });
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
        } catch (e: any) { // TODO: any or Error?
            if (e instanceof NoSuchReminderError) { // TODO: good error name?
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "no such reminder"
                });
            } else {
                res.status(500).json({
                    status: "error",
                    message: "unknown error"
                });
            }
        }
    });
    router.get("/:reminderId", async (req: express.Request, res: express.Response) => {
        try {
            const reminder: Reminder = await schedulingAggregate.getReminder(req.params.reminderId);
            res.status(200).json({
                status: "ok",
                reminder: reminder
            });
        } catch (e: any) { // TODO: any or Error?
            if (e instanceof NoSuchReminderError) { // TODO: good error name?
                res.status(400).json({ // TODO: status code.
                    status: "error",
                    message: "no such reminder"
                });
            } else {
                res.status(500).json({
                    status: "error",
                    message: "unknown error"
                });
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
        } catch (e: any) { // TODO: any or Error?
            res.status(500).json({
                status: "error",
                message: "unknown error"
            });
        }
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
