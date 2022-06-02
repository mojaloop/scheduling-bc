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

import nock from "nock";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IReminder} from "@mojaloop/scheduling-bc-private-types-lib";

export const REMINDER_ID: string = "a";

export class SchedulingServiceMock { // TODO: name.
    private readonly logger: ILogger;
    private readonly URL_REMINDERS: string;

    constructor(
        logger: ILogger,
        URL_REMINDERS: string,
    ) {
        this.logger = logger;
        this.URL_REMINDERS = URL_REMINDERS;

        this.setUp();
    }

    setUp() {
        // Create reminder.
        nock(this.URL_REMINDERS)
            .persist()
            .post("/")
            .reply(
                (_, requestBody: any) => {
                    return this.createReminder(requestBody);
                }
            );

        // Get reminder.
        nock(this.URL_REMINDERS)
            .persist()
            .get(fullPath => true) // TODO.
            .reply(
                (fullPath: string) => {
                    return this.getReminder(
                        // Extract the reminder id from the full path.
                        fullPath.slice(
                            fullPath.lastIndexOf("/") + 1
                        )
                    );
                }
            );

        // Delete reminder.
        nock(this.URL_REMINDERS)
            .persist()
            .delete(fullPath => true) // TODO.
            .reply(
                (fullPath: string) => {
                    return this.deleteReminder(
                        // Extract the reminder id from the full path.
                        fullPath.slice(
                            fullPath.lastIndexOf("/") + 1
                        )
                    );
                }
            );
    }

    createReminder(reminder: IReminder): any[] { // TODO: array with number and object.
        if (reminder.id === REMINDER_ID) {
            return [
                400,
                {
                    status: "error",
                    message: "reminder already exists"
                }
            ];
        }
        return [
            200,
            {
                status: "success",
                reminderId: reminder.id
            }
        ];
    }

    getReminder(reminderId: string): any {
        if (reminderId !== REMINDER_ID) {
            return [
                404,
                {
                    status: "error",
                    message: "no such reminder"
                }
            ];
        }
        return [
            200,
            {
                status: "success",
                reminder: {
                    id: reminderId
                }
            }
        ];
    }

    deleteReminder(reminderId: string): any {
        if (reminderId !== REMINDER_ID) {
            return [
                404,
                {
                    status: "error",
                    message: "no such reminder"
                }
            ];
        }
        return [
            200,
            {
                status: "success",
                message: "reminder deleted"
            }
        ];
    }
}
