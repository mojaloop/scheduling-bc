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
import {
    InvalidReminderIdError, InvalidReminderTaskDetailsError,
    InvalidReminderTaskTypeError,
    InvalidReminderTimeError, MissingReminderPropertiesOrTaskDetailsError, ReminderAlreadyExistsError
} from "./errors";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {
    MLKafkaConsumerOptions,
    MLKafkaConsumerOutputType,
    MLKafkaProducer
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

const SERVICE_NAME = "Scheduling"; // TODO.
const TIME_ZONE = "UTC";
const HTTP_CLIENT_TIMEOUT_MS = 5000;
// Kafka.
const KAFKA_PORT_NO = 9092;
const KAFKA_BROKER_LIST = `localhost:${KAFKA_PORT_NO}`;
const KAFKA_PRODUCER_CLIENT_ID = SERVICE_NAME;

export class SchedulingAggregate {
    private logger: ILogger;
    private repository: ISchedulingRepository;
    private cronJobs: Map<string, CronJob>; // TODO.
    private httpClient: AxiosInstance;
    private kafkaProducer: MLKafkaProducer;

    constructor(repository: ISchedulingRepository) {
        this.logger = new ConsoleLogger();
        this.repository = repository;
        this.cronJobs = new Map();
        this.httpClient = axios.create({
            // baseURL: this.authBaseUrl,
            timeout: HTTP_CLIENT_TIMEOUT_MS,
        });
        this.kafkaProducer = new MLKafkaProducer({
            kafkaBrokerList: KAFKA_BROKER_LIST,
            producerClientId: KAFKA_PRODUCER_CLIENT_ID
        }, this.logger);
        /*// example to get delivery reports TODO.
        this.kafkaProducer.on('deliveryReport', (topic: string, partition: number|null, offset: number|null) => {
            this.logger.info(`delivery report event - topic: ${topic}, partition: ${partition}, offset: ${offset}`)
            return;
        })*/
    }

    async init(): Promise<void> {
        (await this.repository.init()).forEach((reminder: Reminder) => {
            this.cronJobs.set(reminder.id!, new CronJob( // TODO.
                reminder.time,
                () => {
                    this.runReminderTask(<string>reminder.id); // TODO.
                },
                null,
                true,
                TIME_ZONE,
                this /* Context. */));
        })
        await this.kafkaProducer.connect();
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

    private validateReminder(reminder: Reminder): void { // TODO: return type.
        // TODO.
        if (reminder.time == undefined
            || reminder.taskType == undefined
            || (reminder.httpPostTaskDetails?.url == undefined
                && reminder.eventTaskDetails?.topic == undefined)) {
            throw new MissingReminderPropertiesOrTaskDetailsError();
        }
        // id.
        if (reminder.id !== undefined && reminder.id !== null
            && typeof reminder.id !== "string") { // TODO.
            throw new InvalidReminderIdError();
        }
        // time.
        if (typeof reminder.time !== "string" && !(reminder.time instanceof String)
        /*&& typeof reminder.time !== Date*/ && !(reminder.time instanceof Date)) {
            throw new InvalidReminderTimeError();
        }
        // taskType.
        if (!Object.values(ReminderTaskType).includes(reminder.taskType)) {
            throw new InvalidReminderTaskTypeError();
        }
        // TaskDetails.
        if (typeof reminder.httpPostTaskDetails?.url !== "string" /*&& reminder.httpPostTaskDetails.url instanceof String*/
            && typeof reminder.eventTaskDetails?.topic !== "string" /*&& reminder.eventTaskDetails.topic instanceof String*/) {
            throw new InvalidReminderTaskDetailsError();
        }
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
                throw new InvalidReminderTaskTypeError(); // TODO.
        }
    }

    private async sendHTTPPost(reminder: Reminder): Promise<void> { // TODO.
        try {
            if (!reminder.httpPostTaskDetails) { // TODO.
                throw new Error();
            }
            const res: AxiosResponse<any> = await this.httpClient.post(
                reminder.httpPostTaskDetails!.url, // TODO.
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
        await this.kafkaProducer.send({
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
