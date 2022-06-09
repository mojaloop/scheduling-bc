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
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ReminderTaskType} from "@mojaloop/scheduling-bc-private-types";
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
    test("create non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const reminder: Reminder = new Reminder(
            reminderId,
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
        expect(statusCodeResponse).toBe(200);
    });

    test("create existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const reminder: Reminder = new Reminder(
            reminderId,
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
        const statusCodeResponseCreateFirst: number = await schedulingClientMock.createReminder(reminder);
        expect(statusCodeResponseCreateFirst).toBe(200);
        const statusCodeResponseCreateSecond: number = await schedulingClientMock.createReminder(reminder);
        expect(statusCodeResponseCreateSecond).toBe(400);
    });

    test("get non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const statusCodeResponse: number = await schedulingClientMock.getReminder(reminderId);
        expect(statusCodeResponse).toBe(404);
    });

    test("get existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const reminder: Reminder = new Reminder(
            reminderId,
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
        const statusCodeResponseCreate: number = await schedulingClientMock.createReminder(reminder);
        expect(statusCodeResponseCreate).toBe(200);
        const statusCodeResponseGet: number = await schedulingClientMock.getReminder(reminderId);
        expect(statusCodeResponseGet).toBe(200);
    });

    test("get reminders", async () => {
        const statusCodeResponse: number = await schedulingClientMock.getReminders();
        expect(statusCodeResponse).toBe(200);
    });

    test("delete non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const statusCodeResponse: number = await schedulingClientMock.deleteReminder(reminderId);
        expect(statusCodeResponse).toBe(404);
    });

    test("delete existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        const reminder: Reminder = new Reminder(
            reminderId,
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
        const statusCodeResponseCreate: number = await schedulingClientMock.createReminder(reminder);
        expect(statusCodeResponseCreate).toBe(200);
        const statusCodeResponseDelete: number = await schedulingClientMock.deleteReminder(reminderId);
        expect(statusCodeResponseDelete).toBe(200);
    });

    test("delete reminders", async () => {
        const statusCodeResponse: number = await schedulingClientMock.deleteReminders();
        expect(statusCodeResponse).toBe(200);
    });
});
