"use strict";

import {
    InvalidReminderIdTypeError, InvalidReminderTaskDetailsTypeError,
    InvalidReminderTaskTypeError,
    InvalidReminderTaskTypeTypeError,
    InvalidReminderTimeError,
    InvalidReminderTimeTypeError,
    MissingEssentialReminderPropertiesOrTaskDetailsError
} from "./errors/errors_domain";
import {CronTime} from "cron";

export class Reminder {
    id: string;
    time: string | Date;
    payload: any;
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };

    constructor(
        id: string = "",
        time: string | Date,
        payload: any = null,
        taskType: ReminderTaskType,
        httpPostTaskDetails: null | {
            url: string
        } = null,
        eventTaskDetails: null | {
            topic: string
        } = null
    ) {
        this.id = id;
        this.time = time;
        this.payload = payload;
        this.taskType = taskType;
        this.httpPostTaskDetails = httpPostTaskDetails;
        this.eventTaskDetails = eventTaskDetails;
    }

    // TODO.
    static validateReminder(reminder: Reminder): void {
        // Check if the essential properties are present.
        if (reminder.time === undefined
            || reminder.taskType === undefined
            || (reminder.httpPostTaskDetails?.url === undefined
                && reminder.eventTaskDetails?.topic === undefined)) {
            throw new MissingEssentialReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (typeof reminder.id != "string") {
            throw new InvalidReminderIdTypeError();
        }
        // time.
        if (typeof reminder.time != "string") { // TODO: Date.
            throw new InvalidReminderTimeTypeError();
        }
        try {
            new CronTime(reminder.time); // TODO: check Date.
        } catch (e: unknown) {
            // this.logger.debug(typeof e); // object.
            throw new InvalidReminderTimeError();
        }
        // taskType.
        if (typeof reminder.taskType != "number") { // TODO: number? ReminderTaskType?
            throw new InvalidReminderTaskTypeTypeError();
        }
        if (!Object.values(ReminderTaskType).includes(reminder.taskType)) {
            throw new InvalidReminderTaskTypeError();
        }
        // TaskDetails.
        if (typeof reminder.httpPostTaskDetails?.url != "string"
            && typeof reminder.eventTaskDetails?.topic != "string") {
            throw new InvalidReminderTaskDetailsTypeError();
        }
    }
}

export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}
