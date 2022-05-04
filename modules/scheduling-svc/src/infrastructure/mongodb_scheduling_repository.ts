"use strict";

import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../domain/types";
import {MongoClient, Collection, DeleteResult} from "mongodb";
import {NoSuchReminderError} from "../domain/domain_errors";

export class MongoDBSchedulingRepository implements ISchedulingRepository {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly URL_REPO: string;
    private readonly NAME_DB: string;
    private readonly NAME_COLLECTION: string;
    private readonly TIMEOUT_MS_REPO_OPERATIONS: number;
    // Other properties.
    private readonly mongoClient: MongoClient;
    private reminders: Collection;

    constructor(
        logger: ILogger,
        URL_REPO: string,
        NAME_DB: string,
        NAME_COLLECTION: string,
        TIMEOUT_MS_REPO_OPERATIONS: number
    ) {
        this.logger = logger;
        this.URL_REPO = URL_REPO;
        this.NAME_DB = NAME_DB;
        this.NAME_COLLECTION = NAME_COLLECTION;
        this.TIMEOUT_MS_REPO_OPERATIONS = TIMEOUT_MS_REPO_OPERATIONS;

        this.mongoClient = new MongoClient(
            this.URL_REPO,
            {
                // TODO: are other timeouts required?
                socketTimeoutMS: this.TIMEOUT_MS_REPO_OPERATIONS
            }
        );
    }

    async init(): Promise<void> {
        await this.mongoClient.connect();
        this.reminders = this.mongoClient.db(this.NAME_DB).collection(this.NAME_COLLECTION);
        // await this.bootstrap();
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        return (await this.reminders.findOne({id: reminderId})) !== null;
    }

    async storeReminder(reminder: Reminder): Promise<void> {
        await this.reminders.insertOne(reminder);
    }

    // TODO: verify.
    async deleteReminder(reminderId: string): Promise<void> {
        // deleteOne() doesn't throw if the item doesn't exist.
        const ret: DeleteResult = await this.reminders.deleteOne({id: reminderId});
        // ret.acknowledged is true whether the item exists or not.
        if (ret.deletedCount === 0) {
            throw new NoSuchReminderError();
        }
    }

    async getReminder(reminderId: string): Promise<Reminder> {
        return (await this.reminders.findOne({id: reminderId})) as unknown as Reminder;
    }

    async getReminders(): Promise<Reminder[]> { // TODO: Array?
        return (await this.reminders
            .find(
                {}, // All documents.
                {projection: {_id: 0}}) // Don't return the _id field.
            .toArray()) as unknown as Reminder[];
        //throw new Error("not implemented");
    }

    private async bootstrap(): Promise<void> {
        await this.reminders.drop();
        await this.reminders.insertMany([
            {
                "id": "a",
                "time": "*/15 * * * * *",
                "payload": "a",
                "taskType": 0,
                "httpPostTaskDetails": {
                    "url": "http://localhost:1111/"
                },
                "eventTaskDetails": {
                    "topic": "test_topic"
                }
            },
            {
                "id": "b",
                "time": "*/15 * * * * *",
                "payload": "b",
                "taskType": 1,
                "httpPostTaskDetails": {
                    "url": "http://localhost:1111/"
                },
                "eventTaskDetails": {
                    "topic": "test_topic"
                }
            }
        ]);
    }
}
