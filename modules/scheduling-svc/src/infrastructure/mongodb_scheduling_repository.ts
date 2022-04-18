"use strict";

import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../domain/types";
import {MongoClient, Collection} from "mongodb";
import {NoSuchReminderError} from "../domain/errors";

export class MongoDBSchedulingRepository implements ISchedulingRepository {
    private readonly logger: ILogger;
    private readonly mongoClient: MongoClient;
    private reminders: Collection;

    private readonly URL_REPO: string;
    private readonly NAME_DB: string;
    private readonly NAME_COLLECTION: string;

    constructor(
        logger: ILogger,
        urlRepo: string,
        nameDb: string,
        nameCollection: string) {

        this.logger = logger;

        this.URL_REPO = urlRepo;
        this.NAME_DB = nameDb;
        this.NAME_COLLECTION = nameCollection;

        this.mongoClient = new MongoClient(this.URL_REPO);
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

    async deleteReminder(reminderId: string): Promise<void> {
        if ((await this.reminders.deleteOne({id: reminderId})).acknowledged) {
            throw new NoSuchReminderError();
        }
    }

    async getReminder(reminderId: string): Promise<Reminder> {
        return (await this.reminders.findOne({id: reminderId})) as unknown as Reminder;
    }

    async getReminders(): Promise<Reminder[]> { // TODO: Array?
        return (await this.reminders
            .find(
                {},
                {projection: {_id: 0}}) // All reminders.
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
