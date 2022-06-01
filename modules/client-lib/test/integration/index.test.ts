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

import {SchedulingClient} from "../../src";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IReminder, ReminderTaskType} from "@mojaloop/scheduling-bc-private-types-lib"; // TODO.

// TODO: here or inside the describe function?
const URL_REMINDERS: string = "http://localhost:1234/reminders";
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);

// TODO: throw errors instead of return null.
describe("scheduling client - integration tests", () => {
    test("create non-existent reminder", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: Reminder = new Reminder( // TODO.
            reminderIdExpected,
            "*/15 * * * * *",
            {},
            ReminderTaskType.HTTP_POST,
            {
                "url": "http://localhost:1111/"
            },
            {
                "topic": "test_topic"
            }
        );
        try {
            const reminderIdReceived: string = await schedulingClient.createReminder(reminder);
            expect(reminderIdReceived).toBe(reminderIdExpected);
        } catch (e: unknown) {
            fail(e); // TODO.
        }
    });

    test("create existent reminder", async () => {
        // TODO.
    });

    test("get non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        try {
            const reminder: IReminder = await schedulingClient.getReminder(reminderId);
            fail(reminder); // TODO.
        } catch (e: unknown) {
            logger.info(e); // TODO.
        }
    });

    test("get existent reminder", async () => {
        // TODO.
    });

    test("delete non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        try {
            await schedulingClient.deleteReminder(reminderId);
            fail(); // TODO.
        } catch (e: unknown) {
            logger.info(e); // TODO.
        }
    });

    test("delete existent reminder", async () => {
        // TODO.
    });
});
