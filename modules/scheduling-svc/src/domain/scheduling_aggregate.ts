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
import {ISchedulingRepository} from "./interfaces_infrastructure/ischeduling_repository";
import {ISchedulingLocks} from "./interfaces_infrastructure/ischeduling_locks";
import {ISchedulingHTTPClient} from "./interfaces_infrastructure/ischeduling_http_client";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib"
import {Reminder, ReminderTaskType} from "./types";
import {CronJob} from "cron";
import * as uuid from "uuid";
import {ReminderAlreadyExistsError} from "./errors/errors_domain";

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
    async init(): Promise<void> {
        await this.messageProducer.connect();
        await this.repository.init();
        const reminders: Reminder[] = await this.repository.getReminders();
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
    }

    // TODO: order.
    async destroy(): Promise<void> {
        await this.repository.destroy();
        await this.messageProducer.destroy();
    }

    async createReminder(reminder: Reminder): Promise<string> {
        if (reminder.id === undefined || reminder.id === null) { // TODO.
            reminder.id = "";
        }
        Reminder.validateReminder(reminder);
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

    // TODO: timeout getReminder.
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
        return await this.httpClient.post(
            reminder.httpPostTaskDetails?.url || "", // TODO.
            reminder.payload
        );
    }

    private async event(reminder: Reminder): Promise<void> {
        await this.messageProducer.send({
            topic: reminder.eventTaskDetails?.topic,
            value: reminder.payload
        });
    }

    async getReminders(): Promise<Reminder[]> {
        return await this.repository.getReminders();
    }

    async getReminder(reminderId: string): Promise<Reminder | null> {
        return await this.repository.getReminder(reminderId);
    }

    async deleteReminder(reminderId: string): Promise<boolean> {
        const reminderDeleted: boolean = await this.repository.deleteReminder(reminderId);
        if (!reminderDeleted) {
            return false;
        }
        const cronJob: CronJob | undefined = this.cronJobs.get(reminderId); // TODO: Elvis operator?
        if (cronJob === undefined) {
            return true;
        }
        cronJob.stop();
        this.cronJobs.delete(reminderId);
        return true;
    }

    async deleteReminders(): Promise<void> {
        for (const reminderId of this.cronJobs.keys()) { // TODO: of? this.cronJobs.keys()?
            // The return value of deleteReminder() is ignored because the rest of the function is supposed to
            // run even if the reminder wasn't deleted (because it doesn't exist in the repo).
            await this.repository.deleteReminder(reminderId);
            const cronJob: CronJob | undefined = this.cronJobs.get(reminderId); // TODO: Elvis operator?
            if (cronJob === undefined) {
                continue;
            }
            cronJob.stop();
            this.cronJobs.delete(reminderId); // TODO: is this safe to do while iterating?
        }
    }
}
