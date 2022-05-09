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

// TODO: ESLint warning on the top of the editor window.

import {ISchedulingRepository} from "../../../src/domain/interfaces_infrastructure/ischeduling_repository";
import {Reminder} from "../../../src/domain/types";

export class MemorySchedulingRepository implements ISchedulingRepository {
    private readonly map: Map<string, Reminder>;

    constructor() {
        this.map = new Map<string, Reminder>();
    }

    async init(): Promise<void> {
    }

    async destroy(): Promise<void> {
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        return this.map.has(reminderId);
    }

    async storeReminder(reminder: Reminder): Promise<boolean> {
        this.map.set(reminder.id, reminder);
        return true;
    }

    async deleteReminder(reminderId: string): Promise<boolean> {
        return this.map.delete(reminderId);
    }

    async getReminders(): Promise<Reminder[]> {
        return [...this.map.values()];
    }

    async getReminder(reminderId: string): Promise<Reminder | null> {
        return this.map.get(reminderId) || null;
    }
}
