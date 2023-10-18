/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import { IReminder } from "@mojaloop/scheduling-bc-public-types-lib";

export interface IRepo {
    /**
     * @throws an instance of UnableToInitRepoError, if the connection fails.
     */
    init(): Promise<void>;
    destroy(): Promise<void>;
    /**
     * @returns true, if the reminder exists; false, if the reminder doesn't exist.
     * @throws an instance of UnableToGetReminderError, if the operation fails - inconclusive.
     */
    reminderExists(reminderId: string): Promise<boolean>;
    /**
     * @throws an instance of ReminderAlreadyExistsError, if the reminder already exists; an instance of
     * UnableToStoreReminderError, if the operation fails.
     */
    storeReminder(reminder: IReminder): Promise<void>;
    /**
     * @returns the reminder asked for, if it exists; null, if the reminder asked for doesn't exist.
     * @throws an instance of UnableToGetReminderError, if the operation fails - the reminder asked for might or might
     * not exist.
     */
    getReminder(reminderId: string): Promise<IReminder | null>;
    /**
     * @returns an array of reminders, that can be empty.
     * @throws an instance of UnableToGetRemindersError, if the operation fails - there might or might not exist
     * reminders.
     */
    getReminders(): Promise<IReminder[]>;
    /**
     * @throws an instance of NoSuchReminderError, if the reminder doesn't exist; an instance of
     * UnableToDeleteReminderError, if the operation fails - the reminder wasn't deleted, but not because it doesn't
     * exist.
     */
    deleteReminder(reminderId: string): Promise<void>;
}

export interface ILocks {
  init(): Promise<void>;
  destroy(): Promise<void>;
  acquire(lockId: string, durationMs: number): Promise<boolean>;
  release(lockId: string): Promise<boolean>;
}


export interface IHttpPostClient {
    init(): Promise<void>;
    destroy(): Promise<void>;
    send(url:string,payload:unknown, timeout_ms:number):Promise<void>;
}
