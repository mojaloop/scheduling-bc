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

import {IRepo} from "../domain/infrastructure-interfaces/irepo";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IReminder} from "@mojaloop/scheduling-bc-private-types-lib";
import {MongoClient, Collection, DeleteResult} from "mongodb";
import {
    NoSuchReminderErrorRepo, ReminderAlreadyExistsErrorRepo,
    UnableToDeleteReminderErrorRepo,
    UnableToGetReminderErrorRepo,
    UnableToGetRemindersErrorRepo, UnableToInitRepoErrorRepo, UnableToStoreReminderErrorRepo
} from "../domain/errors/repo_errors";

// TODO: if domain errors can't be thrown in the infrastructure, why can domain types be used?
export class MongoRepo implements IRepo {
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
        try {
            await this.mongoClient.connect(); // Throws if the repo is unreachable.
        } catch (e: unknown) {
            throw new UnableToInitRepoErrorRepo(); // TODO.
        }
        // The following doesn't throw if the repo is unreachable, nor if the db or collection don't exist.
        this.reminders = this.mongoClient.db(this.NAME_DB).collection(this.NAME_COLLECTION);
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
            throw new UnableToGetReminderErrorRepo();
        }
    }

    async storeReminder(reminder: IReminder): Promise<void> {
        try {
            // insertOne() allows for duplicates.
            if (await this.reminderExists(reminder.id)) { // TODO: call class's function?
                throw new ReminderAlreadyExistsErrorRepo(); // TODO: here?
            }
            await this.reminders.insertOne(reminder);
        } catch (e: unknown) {
            if (e instanceof ReminderAlreadyExistsErrorRepo) {
                throw e;
            }
            throw new UnableToStoreReminderErrorRepo();
        }
    }

    async getReminder(reminderId: string): Promise<IReminder | null> {
        try {
            // findOne() doesn't throw if no item is found - null is returned.
            const reminder: any = await this.reminders.findOne({id: reminderId}); // TODO: type.
            return reminder as unknown as IReminder; // TODO.
        } catch(e: unknown) {
            throw new UnableToGetReminderErrorRepo();
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
            throw new UnableToGetRemindersErrorRepo();
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        try {
            // deleteOne() doesn't throw if the item doesn't exist.
            const deleteResult: DeleteResult = await this.reminders.deleteOne({id: reminderId});
            // deleteResult.acknowledged is true whether the item exists or not.
            if (deleteResult.deletedCount === 0) {
                throw new NoSuchReminderErrorRepo(); // TODO: here?
            }
        } catch (e: unknown) {
            if (e instanceof NoSuchReminderErrorRepo) {
                throw e;
            }
            throw new UnableToDeleteReminderErrorRepo();
        }
    }
}
