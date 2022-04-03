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

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import {ISchedulingRepository} from "./ischeduling_repository";
import {CronJob} from "cron";
import {Reminder, ReminderTask, ReminderTaskType, TaskEvent, TaskHTTPPost} from "./types";
import * as fetch from "node-fetch";

const TIME_ZONE = "UTC";

export class SchedulingAggregate {
    private repository: ISchedulingRepository;

    constructor(repository: ISchedulingRepository) {
        this.repository = repository;
    }

    async createReminder(reminder: Reminder): Promise<void> {
        await this.repository.storeReminder(reminder);
        const cronJob: CronJob = new CronJob(
            reminder.time,
            () => {
                this.runReminder(reminder.id);
            },
            null,
            true,
            TIME_ZONE,
            this /* Context. */);
    }

    private async runReminder(reminderId: string): Promise<void> {
        /*const reminderTask: ReminderTask = (await this.getReminder(
            // this.mapCronJobToReminderId.get(this /!* CronJob. *!/)
            reminderId
        )).task;*/
        const reminder = await this.repository.getReminder(reminderId);
        if (reminder == null) {
            return;
        }
        switch (reminder.taskType) {
            case ReminderTaskType.HTTP_POST:
                await this.sendHTTPPost(reminder);
                break;
            case ReminderTaskType.EVENT:
                await this.sendEvent(reminder);
                break;
            default:
                // TODO.
        }
    }

    private async sendHTTPPost(reminder: Reminder): Promise<void> {
        // 
        /*await fetch.Request( // TODO: ignore response?
            task.uRL as fetch.RequestInfo, // TODO: check.
            {
                method: "POST",
                body: task.payload,
                headers: { // TODO: necessary?
                    "Content-Type": "application/json"
                }
            })*/
    }

    private async sendEvent(reminder: Reminder): Promise<void> {
        //
    }
}
