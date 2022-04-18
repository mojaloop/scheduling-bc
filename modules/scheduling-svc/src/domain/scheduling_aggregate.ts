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

import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {ISchedulingRepository} from "./ischeduling_repository";
import {ISchedulingLocks} from "./ischeduling_locks";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib"
import {Reminder, ReminderTaskType} from "./types";
import {CronJob} from "cron";
import * as uuid from "uuid";
import {
    InvalidReminderIdError, InvalidReminderTaskDetailsError,
    InvalidReminderTaskTypeError,
    InvalidReminderTimeError, MissingReminderPropertiesOrTaskDetailsError, ReminderAlreadyExistsError
} from "./errors";
import {ISchedulingHTTPClient} from "./ischeduling_http_client";

export class SchedulingAggregate {
    private readonly logger: ILogger;
    private readonly repository: ISchedulingRepository;
    private readonly locks: ISchedulingLocks;
    private readonly cronJobs: Map<string, CronJob>;
    private readonly httpClient: ISchedulingHTTPClient;
    private readonly messageProducer: IMessageProducer;

    private readonly TIME_ZONE: string;
    private readonly TIMEOUT_MS_LOCK_ACQUIRED: number;
    private readonly MIN_DURATION_MS_TASK: number;

    constructor(
        logger: ILogger,
        repository: ISchedulingRepository,
        locks: ISchedulingLocks,
        httpClient: ISchedulingHTTPClient,
        messageProducer: IMessageProducer,
        timeZone: string,
        timeoutMsLockAcquired: number,
        minDurationMsTask: number) {

        this.logger = logger;

        this.repository = repository;
        this.locks = locks;
        this.httpClient = httpClient;
        this.messageProducer = messageProducer;

        this.TIME_ZONE = timeZone;
        this.TIMEOUT_MS_LOCK_ACQUIRED = timeoutMsLockAcquired;
        this.MIN_DURATION_MS_TASK = minDurationMsTask;

        this.cronJobs = new Map<string, CronJob>();
    }

    async init(): Promise<void> {
        await this.messageProducer.connect(); // TODO: first?
        await this.repository.init();
        (await this.repository.getReminders()).forEach((reminder: Reminder) => {
            this.cronJobs.set(reminder.id!, new CronJob( // TODO.
                reminder.time,
                () => {
                    this.runReminderTask(<string>reminder.id); // TODO.
                },
                null,
                true,
                this.TIME_ZONE,
                this /* Context. */));
        })
    }

    async createReminder(reminder: Reminder): Promise<string> {
        this.validateReminder(reminder);
        if (reminder.id !== undefined && reminder.id !== null && reminder.id !== "") { // TODO.
            if (await this.repository.reminderExists(reminder.id)) {
                throw new ReminderAlreadyExistsError();
            }
        } else {
            do {
                reminder.id = uuid.v4();
            } while (await this.repository.reminderExists(reminder.id));
        }
        try {
            await this.repository.storeReminder(reminder);
        } catch (e: any) {
            this.logger.debug(e);
            throw e;
        }
        this.cronJobs.set(reminder.id, new CronJob( // TODO.
            reminder.time,
            () => {
                this.runReminderTask(<string>reminder.id); // TODO.
            },
            null,
            true,
            this.TIME_ZONE,
            this /* Context. */));
        return reminder.id; // TODO.
    }

    // TODO.
    private validateReminder(reminder: Reminder): void {
        if (reminder.time == undefined
            || reminder.taskType == undefined
            || (reminder.httpPostTaskDetails?.url == undefined
                && reminder.eventTaskDetails?.topic == undefined)) {
            throw new MissingReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (reminder.id !== undefined && reminder.id !== null && reminder.id !== ""
            && typeof reminder.id != "string") {
            throw new InvalidReminderIdError();
        }
        // time.
        if (typeof reminder.time != "string"
            && !(reminder.time instanceof Date)) {
            throw new InvalidReminderTimeError();
        }
        // taskType.
        if (!Object.values(ReminderTaskType).includes(reminder.taskType)) {
            throw new InvalidReminderTaskTypeError();
        }
        // TaskDetails.
        if (typeof reminder.httpPostTaskDetails?.url != "string"
            && typeof reminder.eventTaskDetails?.topic != "string") {
            throw new InvalidReminderTaskDetailsError();
        }
    }

    // TODO: timeout getReminder, comment.
    // This function takes at least MIN_DURATION_MS_TASK to execute.
    // Duration of getReminder() + duration of httpPost()/event() <= TIMEOUT_MS_LOCK_ACQUIRED.
    private async runReminderTask(reminderId: string): Promise<boolean> {
        const startTime = Date.now();
        if (!(await this.locks.acquire(reminderId, this.TIMEOUT_MS_LOCK_ACQUIRED))) {
            return false;
        }
        const reminder = await this.repository.getReminder(reminderId);
        if (reminder == null) {
            return false;
        }
        switch (reminder.taskType) {
            case ReminderTaskType.HTTP_POST:
                await this.httpPost(reminder);
                break;
            case ReminderTaskType.EVENT:
                await this.event(reminder);
                break;
            default:
                throw new InvalidReminderTaskTypeError(); // TODO.
        }
        const elapsedTimeMs = Date.now() - startTime;
        if (elapsedTimeMs < this.MIN_DURATION_MS_TASK) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_DURATION_MS_TASK - elapsedTimeMs));
        }
        await this.locks.release(reminderId);
        return true;
    }

    private async httpPost(reminder: Reminder): Promise<boolean> {
        return await this.httpClient.post(reminder.httpPostTaskDetails!.url, reminder.payload);
    }

    private async event(reminder: Reminder): Promise<void> {
        await this.messageProducer.send({
            topic: reminder.eventTaskDetails?.topic,
            value: reminder.payload
        });
    }

    async deleteReminder(reminderId: string): Promise<void> { // TODO: return type.
        // TODO: error.
        this.cronJobs.get(reminderId)?.stop();
        this.cronJobs.delete(reminderId);
        await this.repository.deleteReminder(reminderId);
    }

    async getReminder(reminderId: string): Promise<Reminder> { // TODO: return type.
        return await this.repository.getReminder(reminderId); // TODO: return await?
    }

    async getReminders(): Promise<Reminder[]> { // TODO: return type.
        return await this.repository.getReminders(); // TODO: return await?
    }
}
