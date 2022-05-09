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

 * Community
 - Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ISchedulingRepository} from "../domain/interfaces_infrastructure/ischeduling_repository";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../domain/types";
import {MongoClient, Collection, DeleteResult, InsertOneResult} from "mongodb";
import {
    UnableToDeleteReminderError,
    UnableToGetReminderError,
    UnableToGetRemindersError
} from "../domain/errors/scheduling_repository_errors";

// TODO: verify the behavior of all mongo functions.
// TODO: return booleans and throw errors in the aggregate? handle exceptions.
// TODO: if domain errors can't be thrown in the infrastructure why can the domain types be used?
// TODO: type of the errors caught.
// TODO: send errors?
// TODO: is there any way to check if a function throws without testing?
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

    /**
     * @returns true if it was possible to connect to the repo; false if it wasn't possible to
     * connect to the repo.
     */
    async init(): Promise<boolean> {
        // connect() throws if the repo is unreachable.
        // connect() might throw for other reasons, not sure - the documentation is trash.
        try {
            await this.mongoClient.connect();
        } catch (e: unknown) {
            return false;
        }
        // The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
        this.reminders = this.mongoClient.db(this.NAME_DB).collection(this.NAME_COLLECTION);
        return true;
    }

    /**
     * @returns true.
     */
    async destroy(): Promise<boolean> {
        await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
        return true;
    }

    /**
     * @returns true if the reminder exists; false if the reminder doesn't exist.
     * @throws an instance of Error if the operation failed - inconclusive.
     */
    async reminderExists(reminderId: string): Promise<boolean> {
        try {
            // findOne() doesn't throw if no item is found.
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type; findOne()?
            return reminder !== null;
        } catch(e: unknown) {
            throw new UnableToGetReminderError(); // TODO.
        }
    }

    /**
     * @returns true if the reminder was stored; false if the reminder wasn't stored.
     * @note Allows for duplicates.
     */
    async storeReminder(reminder: Reminder): Promise<boolean> {
        try {
            // insertOne() allows for duplicates.
            const retInsertOne: InsertOneResult<any> = await this.reminders.insertOne(reminder); // TODO: type.
            return true;
        } catch (e: unknown) {
            return false;
        }
    }

    /**
     * @returns true if the reminder was deleted; false if the reminder wasn't deleted because it
     * doesn't exist.
     * @throws an instance of Error if the operation failed - the reminder wasn't deleted, but
     * not because it doesn't exist.
     */
    async deleteReminder(reminderId: string): Promise<boolean> {
        try {
            // deleteOne() doesn't throw if the item doesn't exist.
            const deleteResult: DeleteResult = await this.reminders.deleteOne({id: reminderId});
            // deleteResult.acknowledged is true whether the item exists or not.
            return deleteResult.deletedCount === 1;
        } catch (e: unknown) {
            throw new UnableToDeleteReminderError(); // TODO.
        }
    }

    /**
     * @returns the reminder asked for, if it exists; null, if the reminder asked for doesn't
     * exist.
     * @throws an instance of Error if the operation failed - the reminder asked for might or
     * might not exist.
     */
    async getReminder(reminderId: string): Promise<Reminder | null> { // TODO: is this the way to specify null?
        try {
            // findOne() doesn't throw if no item is found.
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type.
            return reminder as unknown as Reminder; // TODO.
        } catch(e: unknown) {
            throw new UnableToGetReminderError(); // TODO.
        }
    }

    /**
     * @returns an array of Reminder, that can be empty.
     * @throws an instance of Error if the operation failed - there might or might not exist
     * reminders.
     */
    async getReminders(): Promise<Reminder[]> { // TODO: represent empty array.
        try {
            // find() doesn't throw if no items are found.
            const reminders: any = // TODO: type.
                await this.reminders
                    .find(
                        {}, // All documents.
                        {projection: {_id: 0}}) // Don't return the _id field.
                    .toArray();
            return reminders as unknown as Reminder[]; // TODO.
        } catch(e: unknown) {
            throw new UnableToGetRemindersError(); // TODO.
        }
    }
}
