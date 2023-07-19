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

import express from "express";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IConfigurationClient} from "@mojaloop/platform-configuration-bc-public-types-lib";
import {
    IReminder,
    InvalidReminderIdTypeError, InvalidReminderTaskDetailsTypeError,
    InvalidReminderTaskTypeError,
    InvalidReminderTaskTypeTypeError,
    InvalidReminderTimeError,
    InvalidReminderTimeTypeError,
    MissingEssentialReminderPropertiesOrTaskDetailsError, NoSuchReminderError, ReminderAlreadyExistsError
} from "@mojaloop/scheduling-bc-domain-lib";

export class ExpressRoutes {
    private _logger:ILogger;
    private _configClient: IConfigurationClient;

    private _mainRouter = express.Router();


    constructor(configClient: IConfigurationClient, logger:ILogger) {
        this._configClient = configClient;
        this._logger = logger;

        // endpoints
        this._mainRouter.get("/version", this.getVersion.bind(this));

        // Posts.
        this._mainRouter.post("/", this.postReminder.bind(this));
        // Gets.
        this._mainRouter.get("/:reminderId", this.getReminder.bind(this));
        this._mainRouter.get("/", this.getReminders.bind(this));
        // Deletes.
        this._mainRouter.delete("/:reminderId", this.deleteReminder.bind(this));
        this._mainRouter.delete("/", this.deleteReminders.bind(this));
    }

    get MainRouter():express.Router{
        return this._mainRouter;
    }

    private async getVersion(req: express.Request, res: express.Response, next: express.NextFunction){
        this._logger.debug("Got request to version endpoint");
        return res.send({
            environmentName: this._configClient.environmentName,
            bcName: this._configClient.boundedContextName,
            appName: this._configClient.applicationName,
            appVersion: this._configClient.applicationVersion,
            configsIterationNumber: this._configClient.appConfigs.iterationNumber
        });
    }

    private async postReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminderId: string = await this.aggregate.createReminder(req.body);
            res.status(200).json({
                status: "success",
                reminderId: reminderId
            });
        } catch (e: unknown) {
            if (e instanceof MissingEssentialReminderPropertiesOrTaskDetailsError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "missing essential reminder properties or task details");
            } else if (e instanceof InvalidReminderIdTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder id type");
            } else if (e instanceof InvalidReminderTimeTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder time type");
            } else if (e instanceof InvalidReminderTimeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder time");
            } else if (e instanceof InvalidReminderTaskTypeTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder task type type (the type of the task type)");
            } else if (e instanceof InvalidReminderTaskTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder task type");
            } else if (e instanceof InvalidReminderTaskDetailsTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder task details type");
            } else if (e instanceof ReminderAlreadyExistsError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "reminder already exists");
            } else {
                this.sendErrorResponse(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async getReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminder: IReminder | null = await this.aggregate.getReminder(req.params.reminderId);
            if (reminder === null) {
                this.sendErrorResponse(
                    res,
                    404,
                    "no such reminder");
                return;
            }
            res.status(200).json({
                status: "success",
                reminder: reminder
            });
        } catch (e: unknown) {
            if (e instanceof InvalidReminderIdTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder id type");
            } else {
                this.sendErrorResponse(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async getReminders(req: express.Request, res: express.Response): Promise<void> {
        try {
            const reminders: IReminder[] = await this.aggregate.getReminders();
            res.status(200).json({
                status: "success",
                reminders: reminders
            });
        } catch (e: unknown) {
            this.sendErrorResponse(
                res,
                500,
                "unknown error");
        }
    }

    private async deleteReminder(req: express.Request, res: express.Response): Promise<void> {
        try {
            await this.aggregate.deleteReminder(req.params.reminderId);
            res.status(200).json({
                status: "success",
                message: "reminder deleted"
            });
        } catch (e: unknown) {
            if (e instanceof InvalidReminderIdTypeError) {
                this.sendErrorResponse(
                    res,
                    400,
                    "invalid reminder id type");
            } else if (e instanceof NoSuchReminderError) {
                this.sendErrorResponse(
                    res,
                    404,
                    "no such reminder");
                return;
            } else {
                this.sendErrorResponse(
                    res,
                    500,
                    "unknown error");
            }
        }
    }

    private async deleteReminders(req: express.Request, res: express.Response): Promise<void> {
        try {
            await this.aggregate.deleteReminders();
            res.status(200).json({
                status: "success",
                message: "reminders deleted"
            });
        } catch (e: unknown) {
            this.sendErrorResponse(
                res,
                500,
                "unknown error");
        }
    }

    // TODO: method can be static?
    private sendErrorResponse(res: express.Response, statusCode: number, message: string) {
        res.status(statusCode).json({
            result: "error",
            message: message
        });
    }
}
