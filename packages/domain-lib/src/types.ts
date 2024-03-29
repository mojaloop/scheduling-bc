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

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import {
    InvalidReminderIdTypeError, InvalidReminderTaskDetailsTypeError, InvalidReminderTaskTypeError,
    InvalidReminderTaskTypeTypeError,
    InvalidReminderTimeError,
    InvalidReminderTimeTypeError,
    MissingEssentialReminderPropertiesOrTaskDetailsError
} from "./errors";
import {CronTime} from "cron";
import { IReminder, ISingleReminder, ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";

export class Reminder implements IReminder {
    id: string;
    time: string; // TODO: Date.
    payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };

    constructor(
        id = "",
        time: string,
        payload: any = null, // eslint-disable-line @typescript-eslint/no-explicit-any
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
    static validateReminder(reminder: any): void { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Check if the essential properties are present.
        if (reminder.time === undefined
            || reminder.taskType === undefined
            || (reminder.httpPostTaskDetails?.url === undefined
                && reminder.eventTaskDetails?.topic === undefined)) {
            throw new MissingEssentialReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (typeof reminder.id !== "string") {
            throw new InvalidReminderIdTypeError();
        }
        // time.
        if (typeof reminder.time !== "string") {
            throw new InvalidReminderTimeTypeError();
        }
        try {
            new CronTime(reminder.time);
        } catch (e: unknown) {
            throw new InvalidReminderTimeError();
        }
        // taskType.
        if (typeof reminder.taskType !== "string") {
            throw new InvalidReminderTaskTypeTypeError();
        }

        if (!(reminder.taskType in ReminderTaskType)) {
            throw new InvalidReminderTaskTypeError();
        }
        // TaskDetails.
        if (typeof reminder.httpPostTaskDetails?.url !== "string"
            && typeof reminder.eventTaskDetails?.topic !== "string") {
            throw new InvalidReminderTaskDetailsTypeError();
        }
    }
}

export class SingleReminder implements ISingleReminder {
    id: string;
    time: string | number; // TODO: Date.
    payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };

    constructor(
        id = "",
        time: string | number,
        payload: any = null, // eslint-disable-line @typescript-eslint/no-explicit-any
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
    static validateReminder(reminder: any): void { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Check if the essential properties are present.
        if (reminder.time === undefined
            || reminder.taskType === undefined
            || (reminder.httpPostTaskDetails?.url === undefined
                && reminder.eventTaskDetails?.topic === undefined)) {
            throw new MissingEssentialReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (typeof reminder.id !== "string") {
            throw new InvalidReminderIdTypeError();
        }
        // time.
        if (typeof reminder.time !== "string" && typeof reminder.time !== "number") {
            throw new InvalidReminderTimeTypeError();
        }
        try {
            new Date(reminder.time);
        } catch (e: unknown) {
            throw new InvalidReminderTimeError();
        }
        // taskType.
        if (typeof reminder.taskType !== "string") {
            throw new InvalidReminderTaskTypeTypeError();
        }

        if (!(reminder.taskType in ReminderTaskType)) {
            throw new InvalidReminderTaskTypeError();
        }
        // TaskDetails.
        if (typeof reminder.httpPostTaskDetails?.url !== "string"
            && typeof reminder.eventTaskDetails?.topic !== "string") {
            throw new InvalidReminderTaskDetailsTypeError();
        }
    }
}