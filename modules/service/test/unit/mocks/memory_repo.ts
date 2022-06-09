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

// TODO: ESLint warning on the top of the editor window.

import {IRepo} from "../../../src/domain/infrastructure-interfaces/irepo";
import {IReminder} from "@mojaloop/scheduling-bc-private-types";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "../../../src/domain/errors";

export class MemoryRepo implements IRepo {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    // Other properties.
    private readonly reminders: Map<string, IReminder>;

    constructor(
        logger: ILogger,
        URL_REPO: string,
        NAME_DB: string,
        NAME_COLLECTION: string,
        TIMEOUT_MS_REPO_OPERATIONS: number
    ) {
        this.logger = logger;

        this.reminders = new Map<string, IReminder>();
    }

    async init(): Promise<void> {
    }

    async destroy(): Promise<void> {
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        return this.reminders.has(reminderId);
    }

    // TODO.
    async storeReminder(reminder: IReminder): Promise<void> {
        if (this.reminders.has(reminder.id)) {
            throw new ReminderAlreadyExistsError();
        }
        this.reminders.set(reminder.id, reminder);
    }

    async getReminder(reminderId: string): Promise<IReminder | null> {
        return this.reminders.get(reminderId) ?? null;
    }

    async getReminders(): Promise<IReminder[]> {
        return [...this.reminders.values()]; // TODO: check.
    }

    // TODO.
    async deleteReminder(reminderId: string): Promise<void> {
        if (!this.reminders.delete(reminderId)) {
            throw new NoSuchReminderError();
        }
    }
}
