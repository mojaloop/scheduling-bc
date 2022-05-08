"use strict";

import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../domain/types";
import {MongoClient, Collection, DeleteResult} from "mongodb";

// TODO: verify the behavior of all mongo functions.
// TODO: return booleans and throw errors in the aggregate? handle exceptions.
// TODO: if domain errors can't be thrown in the infrastructure why can the domain types be used?
// TODO: type of the errors caught.
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

    // ALMOST DONE.
    async init(): Promise<boolean> {
        try {
            await this.mongoClient.connect(); // TODO: is there any way to check if this throws without testing?
        } catch (e: unknown) { // The repo is unreachable.
            return false;
        }
        // The following doesn't throw if the repo is unreachable.
        this.reminders = this.mongoClient.db(this.NAME_DB).collection(this.NAME_COLLECTION);
        return true;
    }

    // ALMOST DONE.
    // TODO: name.
    async terminate(): Promise<boolean> {
        await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
        return true;
    }

    // ALMOST DONE.
    async reminderExists(reminderId: string): Promise<boolean> {
        // findOne() throws if the repo is unreachable.
        // findOne() doesn't throw if no item is found.
        try {
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type; findOne()?
            return reminder !== null;
        } catch(e: unknown) { // The repo is unreachable.
            return false;
        }
    }

    // ALMOST DONE.
    async storeReminder(reminder: Reminder): Promise<boolean> {
        // insertOne() throws if the repo is unreachable.
        // insertOne() allows for duplicates.
        try {
            const retInsertOne: any = await this.reminders.insertOne(reminder); // TODO: type.
            return true; // TODO.
        } catch (e: unknown) { // The repo is unreachable.
            return false;
        }
    }

    // DONE.
    async deleteReminder(reminderId: string): Promise<boolean> {
        // deleteOne() throws if the repo is unreachable.
        // deleteOne() doesn't throw if the item doesn't exist.
        try {
            const deleteResult: DeleteResult = await this.reminders.deleteOne({id: reminderId});
            // deleteResult.acknowledged is true whether the item exists or not.
            return deleteResult.deletedCount === 1;
        } catch (e: unknown) { // The repo is unreachable.
            return false;
        }
    }

    // ALMOST DONE.
    async getReminder(reminderId: string): Promise<Reminder | null> { // TODO: is this the way to specify null?
        // findOne() throws if the repo is unreachable.
        // findOne() doesn't throw if no item is found.
        try {
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type.
            return reminder as unknown as Reminder; // TODO.
        } catch(e: unknown) { // The repo is unreachable.
            return null;
        }
    }

    // ALMOST DONE.
    async getReminders(): Promise<Reminder[] | null> {
        // find() throws if the repo is unreachable.
        // find() doesn't throw if no items are found.
        try {
            const reminders: any = // TODO: type.
                await this.reminders
                    .find(
                        {}, // All documents.
                        {projection: {_id: 0}}) // Don't return the _id field.
                    .toArray();
            return reminders as unknown as Reminder[]; // TODO.
        } catch(e: unknown) { // The repo is unreachable.
            return null;
        }
    }
}
