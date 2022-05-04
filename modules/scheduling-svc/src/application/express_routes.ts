"use strict";

import express, {Router} from "express"; // TODO.
import {
    InvalidReminderIdTypeError,
    InvalidReminderTaskDetailsTypeError, InvalidReminderTaskTypeError,
    InvalidReminderTaskTypeTypeError, InvalidReminderTimeError,
    InvalidReminderTimeTypeError,
    MissingReminderPropertiesOrTaskDetailsError,
    NoSuchReminderError, ReminderAlreadyExistsError
} from "../domain/domain_errors";
import {Reminder} from "../domain/types";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {SchedulingAggregate} from "../domain/scheduling_aggregate";

// TODO: status codes.
export class ExpressRoutes {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly schedulingAggregate: SchedulingAggregate;
    // Other properties.
    private readonly _router: Router; // TODO: type.

    constructor(
        logger: ILogger,
        schedulingAggregate: SchedulingAggregate
    ) {
        this.logger = logger;
        this.schedulingAggregate = schedulingAggregate;

        this._router = express.Router();
    }

    // TODO: async? should this be called in the constructor?
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

    // TODO: what is this? return type.
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
            const reminder: Reminder = await this.schedulingAggregate.getReminder(req.params.reminderId);
            res.status(200).json({
                status: "ok",
                reminder: reminder
            });
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderError) {
                this.sendError(
                    res,
                    400,
                    "no such reminder");
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
            if (e instanceof MissingReminderPropertiesOrTaskDetailsError) {
                this.sendError(
                    res,
                    400,
                    "missing reminder properties or task details");
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
            } else if (e instanceof InvalidReminderTaskTypeTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task type type");
            } else if (e instanceof InvalidReminderTaskDetailsTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task details type");
            } else if (e instanceof InvalidReminderTimeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder time");
            } else if (e instanceof InvalidReminderTaskTypeError) {
                this.sendError(
                    res,
                    400,
                    "invalid reminder task type");
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
            await this.schedulingAggregate.deleteReminder(req.params.reminderId);
            res.status(200).json({
                status: "ok",
                message: "reminder deleted"
            });
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderError) {
                this.sendError(
                    res,
                    400,
                    "no such reminder");
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

    private validateBodyReminder(body: any): void { // TODO: ReqBody type.
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
}
