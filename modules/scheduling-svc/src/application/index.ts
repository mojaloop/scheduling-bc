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
const memorySchedulingRepository = new MemorySchedulingRepository();
const schedulingAggregate = new SchedulingAggregate(memorySchedulingRepository);

function setUpExpress() {
    app.use(express.json()); // For parsing application/json.
    app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
}

function setUpRoutes() {
    app.use(URL_PATH_REMINDERS, router); // TODO: before setting up the routes?
    router.post("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        await schedulingAggregate.createReminder(req.body); // TODO: await?
    }); // TODO.
    router.delete("/:reminderId", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        await schedulingAggregate.deleteReminder(req.params.reminderId); // TODO: await?
    }); // TODO.
}

async function start(): Promise<void> {
    setUpExpress();
    setUpRoutes();
    app.listen(PORT_NO, () => {
        logger.info("Server on.");
        logger.info(`Host: ${HOST}`);
        logger.info(`Port: ${PORT_NO}`);
        logger.info(`Base URL: ${URL_BASE}`);
    });
}

// TODO.
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
