import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {Reminder} from "../domain/types";
import {MongoClient, Collection} from "mongodb"; // TODO: const MongoClient = require("mongodb").MongoClient.

const HOST_DB = process.env.SCHEDULER_HOST_DB || "localhost"; // TODO.
const PORT_NO_DB = process.env.SCHEDULER_PORT_NO_DB || 27017; // TODO.
const URL_DB = `mongodb://${HOST_DB}:${PORT_NO_DB}`;
const NAME_DB = "Scheduling";
const NAME_COLLECTION = "Reminders";
const FAILED_CONNECTION = "unable to connect to database";

export class MemorySchedulingRepository implements ISchedulingRepository {
    mongoClient: MongoClient;
    reminders: Collection

    constructor() {
        this.mongoClient = new MongoClient(URL_DB);
        try {
            await this.mongoClient.connect(); // Can throw an error.
        } catch (err) {
            return Promise.reject(new Error(FAILED_CONNECTION)); // TODO.
        }
        this.reminders = this.mongoClient.db(NAME_DB).collection(NAME_COLLECTION);
    }

    async storeReminder(reminder: Reminder): Promise<void> {
        try {
            await this.reminders.insertOne(reminder);
        } catch (err) {
            return Promise.reject();
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        try {
            await this.reminders.deleteOne(reminderId);
        } catch (err) {
            return Promise.reject();
        }
    }

    async getReminders(): Promise<Array> { // TODO: Array?
        try {
            return await this.reminders
                .find(
                    {}, // Query. All documents (entries) in the collection (reminders).
                    {projection: {_id: 0}}) // All reminders.
                .toArray();
        } catch (err) {
            return Promise.reject();
        }
    }
}
