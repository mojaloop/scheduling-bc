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

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IRepo} from "./infrastructure-interfaces/irepo";
import {ILocks} from "./infrastructure-interfaces/ilocks";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib"
import {Reminder} from "./types";
import {ReminderTaskType} from "@mojaloop/scheduling-bc-private-types-lib";
import {CronJob} from "cron";
import * as uuid from "uuid";
import {
    InvalidReminderIdTypeErrorDomain, NoSuchReminderErrorDomain,
    ReminderAlreadyExistsErrorDomain
} from "./errors/domain_errors";
import axios, {AxiosInstance} from "axios";
import {NoSuchReminderErrorRepo, ReminderAlreadyExistsErrorRepo} from "./errors/repo_errors";

// TODO: check error handling.
export class Aggregate {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly repo: IRepo;
    private readonly locks: ILocks;
    private readonly messageProducer: IMessageProducer;
    private readonly TIME_ZONE: string;
    private readonly TIMEOUT_MS_LOCK_ACQUIRED: number;
    private readonly MIN_DURATION_MS_TASK: number;
    // Other properties.
    private readonly httpClient: AxiosInstance;
    private readonly cronJobs: Map<string, CronJob>;

    constructor(
        logger: ILogger,
        repo: IRepo,
        locks: ILocks,
        messageProducer: IMessageProducer,
        TIME_ZONE: string,
        TIMEOUT_MS_LOCK_ACQUIRED: number,
        MIN_DURATION_MS_TASK: number,
        timeoutMsHttpClient: number
    ) {
        this.logger = logger;
        this.repo = repo;
        this.locks = locks;
        this.messageProducer = messageProducer;
        this.TIME_ZONE = TIME_ZONE;
        this.TIMEOUT_MS_LOCK_ACQUIRED = TIMEOUT_MS_LOCK_ACQUIRED;
        this.MIN_DURATION_MS_TASK = MIN_DURATION_MS_TASK;

        this.httpClient = axios.create({
            timeout: timeoutMsHttpClient
        });
        this.cronJobs = new Map<string, CronJob>();
    }

    async init(): Promise<void> {
        let reminders: Reminder[];
        // TODO.
        try {
            await this.messageProducer.connect(); // Throws if the producer is unreachable.
            await this.repo.init();
            reminders = await this.repo.getReminders();
        } catch (e: unknown) {
            this.logger.error(e);
            throw e;
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
    }

    async destroy(): Promise<void> {
        await this.messageProducer.destroy();
        await this.repo.destroy();
    }

    async createReminder(reminder: Reminder): Promise<string> { // TODO: Reminder or IReminder?
        // To facilitate the creation of reminders, undefined/null ids are accepted and converted to empty strings
        // (so that random UUIds are generated).
        if (reminder.id === undefined || reminder.id === null) { // TODO.
            reminder.id = "";
        }
        Reminder.validateReminder(reminder);
        try {
            if (reminder.id === "") {
                do {
                    reminder.id = uuid.v4();
                } while (await this.repo.reminderExists(reminder.id));
            }
            await this.repo.storeReminder(reminder);
        } catch (e: unknown) {
            if (e instanceof ReminderAlreadyExistsErrorRepo) { // TODO: use repo error here?
                throw ReminderAlreadyExistsErrorDomain;
            }
            this.logger.error(e);
            throw new Error();
        }
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

    // This function takes at least MIN_DURATION_MS_TASK to execute.
    // Duration of getReminder() + duration of httpPost()/event() <= TIMEOUT_MS_LOCK_ACQUIRED.
    private async runReminderTask(reminderId: string): Promise<void> {
        const startTime = Date.now();
        if (!(await this.locks.acquire(reminderId, this.TIMEOUT_MS_LOCK_ACQUIRED))) {
            return;
        }
        try {
            const reminder: Reminder | null = await this.repo.getReminder(reminderId);
            if (reminder === null) {
                this.logger.error("no such reminder"); // TODO.
                return; // TODO: throw?
            }
            switch (reminder.taskType) {
                case ReminderTaskType.HTTP_POST:
                    await this.sendHttpPost(reminder);
                    break;
                case ReminderTaskType.EVENT:
                    await this.sendEvent(reminder);
                    break;
            }
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < this.MIN_DURATION_MS_TASK) {
                await new Promise(resolve => setTimeout(resolve, this.MIN_DURATION_MS_TASK - elapsedTime));
            }
        } catch (e: unknown) {
            this.logger.error(e);
            return; // TODO: throw?
        } finally {
            await this.locks.release(reminderId);
        }
    }

    private async sendHttpPost(reminder: Reminder): Promise<void> { // TODO: Reminder or IReminder?
        /**
         * By default, Axios throws if:
         * - the server is unreachable;
         * - the status code falls out of the 2xx range.
         */
        try {
            await this.httpClient.post(
                reminder.httpPostTaskDetails?.url ?? "",
                reminder.payload
            );
        } catch (e: unknown) {
            this.logger.error(e); // TODO: necessary?
            // TODO: throw?
        }
    }

    private async sendEvent(reminder: Reminder): Promise<void> { // TODO: Reminder or IReminder?
        // TODO: check if throws.
        await this.messageProducer.send({
            topic: reminder.eventTaskDetails?.topic,
            value: reminder.payload
        });
    }

    async getReminder(reminderId: string): Promise<Reminder | null> { // TODO: Reminder or IReminder?
        if (typeof reminderId != "string") { // TODO.
            throw new InvalidReminderIdTypeErrorDomain();
        }
        try {
            return await this.repo.getReminder(reminderId);
        } catch (e: unknown) {
            this.logger.error(e);
            throw new Error();
        }
    }

    async getReminders(): Promise<Reminder[]> { // TODO: Reminder or IReminder?
        try {
            return await this.repo.getReminders();
        } catch (e: unknown) {
            this.logger.error(e);
            throw new Error();
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        if (typeof reminderId != "string") { // TODO.
            throw new InvalidReminderIdTypeErrorDomain();
        }
        try {
            // TODO: place everything here or just the deleteReminder() call?
            await this.repo.deleteReminder(reminderId);
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderErrorRepo) { // TODO: use repo error here?
                throw new NoSuchReminderErrorDomain();
            }
            this.logger.error(e);
            throw new Error();
        }
        const cronJob: CronJob | undefined = this.cronJobs.get(reminderId);
        if (cronJob === undefined) {
            return;
        }
        cronJob.stop();
        this.cronJobs.delete(reminderId);
    }

    async deleteReminders(): Promise<void> {
        for (const reminderId of this.cronJobs.keys()) { // TODO: const? of?
            try {
                // TODO: place everything here or just the deleteReminder() call?
                await this.repo.deleteReminder(reminderId);
            } catch (e: unknown) {
                if (e instanceof NoSuchReminderErrorRepo) { // TODO: use repo error here?
                    throw new NoSuchReminderErrorDomain();
                }
                this.logger.error(e);
                throw new Error();
            }
            const cronJob: CronJob | undefined = this.cronJobs.get(reminderId);
            if (cronJob === undefined) {
                continue;
            }
            cronJob.stop();
            this.cronJobs.delete(reminderId);
        }
    }
}
