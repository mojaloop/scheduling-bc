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

import {ISchedulingRepository} from "./ischeduling_repository";
import {CronJob} from "cron";
import {Reminder, ReminderTaskType} from "./types";
import * as  uuid from "uuid";
import axios, {AxiosResponse, AxiosInstance} from "axios";
import {InvalidReminderError, InvalidTaskTypeError} from "./errors";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";

const TIME_ZONE = "UTC";
const HTTP_CLIENT_TIMEOUT_MS = 5000;

export class SchedulingAggregate {
    private logger: ILogger;
    private repository: ISchedulingRepository;
    private cronJobs: Map<string, CronJob>; // TODO.
    private httpClient: AxiosInstance;
    // private kafkaProducer: MLKafkaProducer =  new MLKafkaProducer(producerOptions, logger)

    constructor(repository: ISchedulingRepository) {
        this.logger = new ConsoleLogger();
        this.repository = repository;
        this.cronJobs = new Map();
        this.httpClient = axios.create({
            // baseURL: this.authBaseUrl,
            timeout: HTTP_CLIENT_TIMEOUT_MS,
        });
    }

    async createReminder(reminder: Reminder): Promise<string> {
        // TODO.
        /*if (reminder.id == undefined
            || reminder.time == undefined
            || reminder.payload == undefined
            || reminder.taskType == undefined
            || reminder.hTTPPostTaskDetails == undefined
            || reminder.eventTaskDetails == undefined) {
            throw new InvalidReminderError();
        }*/
        if (!reminder.id) { // TODO.
            do {
                reminder.id = uuid.v4();
            } while (await this.repository.reminderExists(reminder.id));
        }
        await this.repository.storeReminder(reminder);
        this.cronJobs.set(reminder.id, new CronJob( // TODO.
            reminder.time,
            () => {
                this.runReminderTask(<string>reminder.id); // TODO.
            },
            null,
            true,
            TIME_ZONE,
            this /* Context. */));
        return reminder.id; // TODO.
    }

    private async runReminderTask(reminderId: string): Promise<void> {
        const reminder = await this.repository.getReminder(reminderId);
        if (reminder == null) {
            return;
        }
        switch (reminder.taskType) {
            case ReminderTaskType.HTTP_POST:
                await this.sendHTTPPost(reminder);
                break;
            case ReminderTaskType.EVENT:
                await this.sendEvent(reminder);
                break;
            default:
                throw new InvalidTaskTypeError(); // TODO.
        }
    }

    private async sendHTTPPost(reminder: Reminder): Promise<void> { // TODO.
        try {
            const res: AxiosResponse<any> = await this.httpClient.post(
                <string>reminder.httpPostTaskDetails?.url, // TODO.
                reminder.payload, {
                    validateStatus: (status) => {
                        // Resolve only if the status code is 200 or 404, everything else throws.
                        // return status == 200 || status == 404;
                        return status == 200;
                    }
                });
            /*if (res.status != 200) {
                return null;
            }*/
            this.logger.info(res);
        } catch (e: any) {
            this.logger.error(e);
        }
    }

    private async sendEvent(reminder: Reminder): Promise<void> {
        throw new Error("not implemented");
    }

    async deleteReminder(reminderId: string): Promise<void> { // TODO: return type.
        await this.repository.deleteReminder(reminderId);
        this.cronJobs.get(reminderId)?.stop();
        this.cronJobs.delete(reminderId);
    }

    async getReminder(reminderId: string): Promise<Reminder> { // TODO: return type.
        return await this.repository.getReminder(reminderId); // TODO: return await?
    }

    async getReminders(): Promise<Reminder[]> { // TODO: return type.
        return await this.repository.getReminders(); // TODO: return await?
    }
}
