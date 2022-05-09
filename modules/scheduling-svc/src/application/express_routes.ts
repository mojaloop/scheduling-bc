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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Community
 - Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import express from "express";
import {
    InvalidReminderIdTypeError,
    InvalidReminderTaskDetailsTypeError,
    InvalidReminderTaskTypeError,
    InvalidReminderTaskTypeTypeError,
    InvalidReminderTimeError,
    InvalidReminderTimeTypeError, MissingEssentialReminderPropertiesOrTaskDetailsError,
    ReminderAlreadyExistsError
} from "../domain/errors/domain_errors";
import {Reminder} from "../domain/types";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {SchedulingAggregate} from "../domain/scheduling_aggregate";

// TODO: check status codes.
export class ExpressRoutes {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly schedulingAggregate: SchedulingAggregate;
    // Other properties.
    private readonly _router: express.Router;

    constructor(
        logger: ILogger,
        schedulingAggregate: SchedulingAggregate
    ) {
        this.logger = logger;
        this.schedulingAggregate = schedulingAggregate;

        this._router = express.Router();

        this.setUpRoutes();
    }

    setUpRoutes(): void {
        // Gets.
        this._router.get("/", this.getReminders.bind(this));
        this._router.get("/:reminderId", this.getReminder.bind(this));
        // Posts.
        this._router.post("/", this.postReminder.bind(this));
        // Deletes.
        this._router.delete("/:reminderId", this.deleteReminder.bind(this));
        this._router.delete("/", this.deleteReminders.bind(this));
    }

    // TODO.
    get router(): express.Router {
        return this._router;
    }

    private async getReminders(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminders: Reminder[] = await this.schedulingAggregate.getReminders();
            res.status(200).json({
                status: "ok",
                reminders: reminders
            });
        } catch (e: unknown) {
            this.sendError(
                res,
                500,
                "unknown error");
        }
    }

    private async getReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminder: Reminder | null = await this.schedulingAggregate.getReminder(req.params.reminderId);
            if (reminder === null) {
                this.sendError(
                    res,
                    404,
                    "no such reminder");
                return;
            }
            res.status(200).json({
                status: "ok",
                reminder: reminder
            });
        } catch (e: unknown) {
            if (e instanceof InvalidReminderIdTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder id type");
            } else {
                this.sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async postReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminderId: string = await this.schedulingAggregate.createReminder(req.body);
            res.status(200).json({
                status: "ok",
                reminderId: reminderId
            });
        } catch (e: unknown) {
            if (e instanceof MissingEssentialReminderPropertiesOrTaskDetailsError) {
                this.sendError(
                    res,
                    400,
                    "missing essential reminder properties or task details");
            } else if (e instanceof InvalidReminderIdTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder id type");
            } else if (e instanceof InvalidReminderTimeTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder time type");
            } else if (e instanceof InvalidReminderTimeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder time");
            } else if (e instanceof InvalidReminderTaskTypeTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task type type (the type of the task type)");
            } else if (e instanceof InvalidReminderTaskTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task type");
            } else if (e instanceof InvalidReminderTaskDetailsTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task details type");
            } else if (e instanceof ReminderAlreadyExistsError) {
                this.sendError(
                    res,
                    400,
                    "reminder already exists");
            } else {
                this.sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async deleteReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminderDeleted: boolean = await this.schedulingAggregate.deleteReminder(req.params.reminderId);
             if (!reminderDeleted) {
                 this.sendError(
                     res,
                     404,
                     "no such reminder");
                 return;
             }
            res.status(200).json({
                status: "ok",
                message: "reminder deleted"
            });
        } catch (e: unknown) {
            if (e instanceof InvalidReminderIdTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder id type");
            } else {
                this.sendError(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async deleteReminders(req: express.Request, res: express.Response): Promise<void> {
        try {
            await this.schedulingAggregate.deleteReminders();
            res.status(200).json({
                status: "ok",
                message: "reminders deleted"
            });
        } catch (e: unknown) {
            this.sendError(
                res,
                500,
                "unknown error");
        }
    }

    private sendError(res: express.Response, statusCode: number, message: string) {
        res.status(statusCode).json({
            status: "error",
            message: message
        });
    }
}
