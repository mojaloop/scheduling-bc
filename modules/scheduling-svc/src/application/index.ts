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
import {MemorySchedulingRepository} from "../infrastructure/memory_scheduling_repository";
import {
    InvalidReminderIdError,
    InvalidReminderTaskDetailsError,
    InvalidReminderTaskTypeError,
    InvalidReminderTimeError, MissingReminderPropertiesOrTaskDetailsError,
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "../domain/errors";
import {Reminder} from "../domain/types";
import {MongoDBSchedulingRepository} from "../infrastructure/mongodb_scheduling_repository";

// Constants.
const SERVICE_NAME = "Scheduling";
const HOST = process.env.SCHEDULER_HOST || "localhost"; // TODO.
const PORT_NO = process.env.SCHEDULER_PORT_NO || 1234; // TODO.
// URLs.
const URL_BASE = `http://${HOST}:${PORT_NO}`;
const URL_PATH_REMINDERS = "/reminders";

// Logger.
const logger: ILogger = new ConsoleLogger();
// Express.
const app = express();
const router = express.Router();
// Domain and infrastructure.
const schedulingRepository = new MongoDBSchedulingRepository();
const schedulingAggregate = new SchedulingAggregate(schedulingRepository);

function setUpExpress() {
    app.use(express.json()); // For parsing application/json.
    app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
}

function setUpRoutes() {
    app.use(URL_PATH_REMINDERS, router);
    router.post("/", async (req: express.Request, res: express.Response) => { // TODO: next.
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
    router.delete("/:reminderId", async (req: express.Request, res: express.Response, next: express.NextFunction) => { // TODO: next.
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
    router.get("/:reminderId", async (req: express.Request, res: express.Response, next: express.NextFunction) => { // TODO: next.
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
    router.get("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => { // TODO: next.
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
    app.listen(PORT_NO, () => {
        logger.info("Server on.");
        logger.info(`Host: ${HOST}`);
        logger.info(`Port: ${PORT_NO}`);
        logger.info(`Base URL: ${URL_BASE}`);
    });
}

async function handleIntAndTermSignals(signal: NodeJS.Signals): Promise<void> {
    logger.info(`${SERVICE_NAME} - ${signal} received, cleaning up...`);
    process.exit();
}

// SIGINT (Ctrl + c).
process.on("SIGINT", handleIntAndTermSignals.bind(this));
// SIGTERM.
process.on("SIGTERM", handleIntAndTermSignals.bind(this));
// Exit.
process.on("exit", () => {
    logger.info(`${SERVICE_NAME} - exiting...`);
});

start();
