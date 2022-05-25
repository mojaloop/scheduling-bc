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

import {SchedulingClientMock} from "./scheduling_client_mock";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";

import {ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";
import {Reminder} from "../../src/domain/types";

// TODO: here or inside the describe function?
const URL_REMINDERS: string = "http://localhost:1234/reminders";
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const schedulingClientMock: SchedulingClientMock = new SchedulingClientMock(
    logger,
    URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);

describe("scheduling service - integration tests", () => {
    test("get reminders", async () => {
        const statusCodeResponse: number = await schedulingClientMock.getReminders();
        await expect(statusCodeResponse).toBe(200);
    });

    test("get existent reminder", async () => { // TODO: existent?
        // TODO: create reminder.
        const statusCodeResponse: number = await schedulingClientMock.getReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("get non-existent reminder", async () => { // TODO: non-existent?
        // TODO: delete reminder.
        const statusCodeResponse: number = await schedulingClientMock.getReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("create non-existent reminder", async () => {
        // TODO: delete reminder.
        const reminder: Reminder = new Reminder(
            "a",
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
        const statusCodeResponse: number = await schedulingClientMock.createReminder(reminder);
        await expect(statusCodeResponse).toBe(200);
    });

    test("delete existent reminder", async () => {
        // TODO: create reminder.
        const statusCodeResponse: number = await schedulingClientMock.deleteReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("delete reminders", async () => {
        const statusCodeResponse: number = await schedulingClientMock.deleteReminders();
        await expect(statusCodeResponse).toBe(200);
    });
});
