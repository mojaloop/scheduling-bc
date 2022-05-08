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
import {CronJob, CronTime} from "cron";
import * as uuid from "uuid";
import {
    InvalidReminderIdTypeError, InvalidReminderTaskDetailsTypeError,
    InvalidReminderTaskTypeError, InvalidReminderTaskTypeTypeError,
    InvalidReminderTimeError, InvalidReminderTimeTypeError,
    MissingReminderPropertiesOrTaskDetailsError,
    ReminderAlreadyExistsError, RepoUnreachableError
} from "./domain_errors";
import {ISchedulingHTTPClient} from "./ischeduling_http_client";

export class SchedulingAggregate {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly repository: ISchedulingRepository;
    private readonly locks: ISchedulingLocks;
    private readonly httpClient: ISchedulingHTTPClient;
    private readonly messageProducer: IMessageProducer;
    private readonly TIME_ZONE: string;
    private readonly TIMEOUT_MS_LOCK_ACQUIRED: number;
    private readonly MIN_DURATION_MS_TASK: number;
    // Other properties.
    private readonly cronJobs: Map<string, CronJob>;

    constructor(
        logger: ILogger,
        repository: ISchedulingRepository,
        locks: ISchedulingLocks,
        httpClient: ISchedulingHTTPClient,
        messageProducer: IMessageProducer,
        TIME_ZONE: string,
        TIMEOUT_MS_LOCK_ACQUIRED: number,
        MIN_DURATION_MS_TASK: number,
    ) {
        this.logger = logger;
        this.repository = repository;
        this.locks = locks;
        this.httpClient = httpClient;
        this.messageProducer = messageProducer;
        this.TIME_ZONE = TIME_ZONE;
        this.TIMEOUT_MS_LOCK_ACQUIRED = TIMEOUT_MS_LOCK_ACQUIRED;
        this.MIN_DURATION_MS_TASK = MIN_DURATION_MS_TASK;

        this.cronJobs = new Map<string, CronJob>();
    }

    // TODO: order.
    async init(): Promise<boolean> {
        await this.messageProducer.connect();
        await this.repository.init();
        const reminders: Reminder[] | null = await this.repository.getReminders();
        if (reminders === null) {
            return false;
        }
        reminders.forEach((reminder: Reminder) => {
            this.cronJobs.set(reminder.id, new CronJob(
                reminder.time,
                () => {
                    this.runReminderTask(reminder.id);
                },
                null,
                true,
                this.TIME_ZONE,
                this /* Context. */));
        });
        return true;
    }

    // TODO: name.
    async terminate(): Promise<void> {
        await this.repository.terminate();
        await this.messageProducer.destroy();
    }

    async createReminder(reminder: Reminder): Promise<string> {
        this.validateReminder(reminder);
        if (reminder.id === "") {
            do {
                reminder.id = uuid.v4();
            } while (await this.repository.reminderExists(reminder.id));
        } else {
            if (await this.repository.reminderExists(reminder.id)) {
                throw new ReminderAlreadyExistsError();
            }
        }
        await this.repository.storeReminder(reminder);
        this.cronJobs.set(reminder.id, new CronJob(
            reminder.time,
            () => {
                this.runReminderTask(reminder.id);
            },
            null,
            true,
            this.TIME_ZONE,
            this /* Context. */));
        return reminder.id;
    }

    // TODO.
    private validateReminder(reminder: Reminder): void {
        // Check if the essential properties are present.
        if (reminder.time === undefined
            || reminder.taskType === undefined
            || (reminder.httpPostTaskDetails?.url === undefined
                && reminder.eventTaskDetails?.topic === undefined)) {
            throw new MissingReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (reminder.id !== undefined
            && reminder.id !== null
            && typeof reminder.id != "string") {
            throw new InvalidReminderIdTypeError();
        }
        // time.
        if (typeof reminder.time != "string") {
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
        // If the id is undefined or null, change it to "". TODO.
        if (typeof reminder.id != "string") {
            reminder.id = "";
        }
    }

    // TODO: timeout getReminder, comment.
    // This function takes at least MIN_DURATION_MS_TASK to execute.
    // Duration of getReminder() + duration of httpPost()/event() <= TIMEOUT_MS_LOCK_ACQUIRED.
    private async runReminderTask(reminderId: string): Promise<void> {
        const startTime = Date.now();
        if (!(await this.locks.acquire(reminderId, this.TIMEOUT_MS_LOCK_ACQUIRED))) {
            return;
        }
        try {
            const reminder = await this.repository.getReminder(reminderId);
            if (reminder == null) {
                return;
            }
            switch (reminder.taskType) {
                case ReminderTaskType.HTTP_POST:
                    await this.httpPost(reminder);
                    break;
                case ReminderTaskType.EVENT:
                    await this.event(reminder);
                    break;
            }
            const elapsedTimeMs = Date.now() - startTime;
            if (elapsedTimeMs < this.MIN_DURATION_MS_TASK) {
                await new Promise(resolve => setTimeout(resolve, this.MIN_DURATION_MS_TASK - elapsedTimeMs));
            }
        } finally {
            await this.locks.release(reminderId);
        }
    }

    private async httpPost(reminder: Reminder): Promise<boolean> {
        return await this.httpClient.post(reminder.httpPostTaskDetails?.url || "", reminder.payload); // TODO.
    }

    private async event(reminder: Reminder): Promise<void> {
        await this.messageProducer.send({
            topic: reminder.eventTaskDetails?.topic,
            value: reminder.payload
        });
    }

    async deleteReminder(reminderId: string): Promise<void> {
        // TODO: order.
        this.cronJobs.get(reminderId)?.stop();
        // TODO: 1st get the reminder, continue if exists
        await this.repository.deleteReminder(reminderId);
        this.cronJobs.delete(reminderId);
    }

    async deleteReminders(): Promise<void> {
        // TODO: order; deleteReminders in the repo? return ignored.
        for (const id of this.cronJobs.keys()) {
            const job = this.cronJobs.get(id);
            if (!job) continue;
            job.stop();
            // map.delete(reminderId);
            await this.repository.deleteReminder(id);
        }
        /*this.cronJobs.forEach(async (cronJob: CronJob, reminderId: string, map: Map<string, CronJob>) => {
            cronJob.stop();
            // map.delete(reminderId);
            await this.repository.deleteReminder(reminderId);
        });*/
        this.cronJobs.clear();
    }

    async getReminder(reminderId: string): Promise<Reminder> {
        const reminder: Reminder | null = await this.repository.getReminder(reminderId);
        if (reminder === null) {
            throw new RepoUnreachableError(); // TODO.
        }
        return reminder;
    }

    async getReminders(): Promise<Reminder[]> {
        const reminders: Reminder[] | null = await this.repository.getReminders();
        if (reminders === null) {
            throw new RepoUnreachableError(); // TODO.
        }
        return reminders;
    }
}
