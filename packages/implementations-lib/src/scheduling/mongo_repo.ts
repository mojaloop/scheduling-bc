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

import { IRepo, IReminder } from "@mojaloop/scheduling-bc-domain-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {MongoClient, Collection, DeleteResult} from "mongodb";
import {
    NoSuchReminderError,
    ReminderAlreadyExistsError,
    UnableToDeleteReminderError, UnableToGetReminderError,
    UnableToGetRemindersError, UnableToInitRepoError, UnableToStoreReminderError
} from "../errors";

// TODO: if domain errors can't be thrown in the infrastructure, why can domain types be used?
export class MongoRepo implements IRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private readonly _dbName;
    private readonly _collectionName = "reminders";
    private mongoClient: MongoClient;
    private reminders: Collection;
    private readonly timeoutRepoOperations: number;

    constructor(logger: ILogger, connectionString: string, dbName: string, timeoutRepoOperations: number) {

        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
        this._dbName = dbName;
        this.timeoutRepoOperations = timeoutRepoOperations;

        this.mongoClient = new MongoClient(this._connectionString,
            {
                // TODO: are other timeouts required?
                socketTimeoutMS: this.timeoutRepoOperations
            });
        this.mongoClient.connect();
        this.reminders = this.mongoClient
            .db(this._dbName)
            .collection(this._collectionName);
    }

    async init(): Promise<void> {
        try {
            this.mongoClient = new MongoClient(this._connectionString);
            this.mongoClient.connect();
            this.reminders = this.mongoClient
                .db(this._dbName)
                .collection(this._collectionName);
        } catch (e: unknown) {
            this._logger.error(
                `Unable to connect to the database: ${(e as Error).message}`
            );
            throw new UnableToInitRepoError(
                "Unable to connect to the database"
            );
        }
    }

    async destroy(): Promise<void> {
        await this.mongoClient.close(); // Doesn't throw if the repo is unreachable.
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        try {
            // findOne() doesn't throw if no item is found - null is returned.
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type.
            return reminder !== null;
        } catch(e: unknown) {
            throw new UnableToGetReminderError();
        }
    }

    async storeReminder(reminder: IReminder): Promise<void> {
        try {
            // insertOne() allows for duplicates.
            if (await this.reminderExists(reminder.id)) { // TODO: call class's function?
                throw new ReminderAlreadyExistsError(); // TODO: here?
            }
            await this.reminders.insertOne(reminder);
        } catch (e: unknown) {
            if (e instanceof ReminderAlreadyExistsError) {
                throw e;
            }
            throw new UnableToStoreReminderError();
        }
    }

    async getReminder(reminderId: string): Promise<IReminder | null> {
        try {
            // findOne() doesn't throw if no item is found - null is returned.
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type.
            return reminder as unknown as IReminder; // TODO.
        } catch(e: unknown) {
            throw new UnableToGetReminderError();
        }
    }

    async getReminders(): Promise<IReminder[]> {
        try {
            // find() doesn't throw if no items are found.
            const reminders: any = // TODO: type.
                await this.reminders
                    .find(
                        {}, // All documents.
                        {projection: {_id: 0}}) // Don't return the _id field.
                    .toArray();
            return reminders as unknown as IReminder[]; // TODO.
        } catch(e: unknown) {
            throw new UnableToGetRemindersError();
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        try {
            // deleteOne() doesn't throw if the item doesn't exist.
            const deleteResult: DeleteResult = await this.reminders.deleteOne({id: reminderId});
            // deleteResult.acknowledged is true whether the item exists or not.
            if (deleteResult.deletedCount === 0) {
                throw new NoSuchReminderError(); // TODO: here?
            }
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderError) {
                throw e;
            }
            throw new UnableToDeleteReminderError();
        }
    }
}
