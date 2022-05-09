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

import {SchedulingClient} from "./scheduling_client";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../../dist/domain/types";

const TIMEOUT_MS_HTTP_REQUEST: number = 10_000;
const URL_REMINDERS: string = "http://localhost:1234/reminders";

const logger: ILogger = new ConsoleLogger();
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    TIMEOUT_MS_HTTP_REQUEST,
    URL_REMINDERS
);

// TODO: are the tests run sequentially? file structure; how many tests?
describe("integration tests", () => {
    beforeAll(async () => {
        await schedulingClient.deleteReminders();
    });
    /*beforeEach(async () => {
    });
    afterEach(async () => {
    });
    afterAll(async () => {
    });*/

    test("get reminders", async () => {
        const statusCodeResponse: number = await schedulingClient.getReminders();
        await expect(statusCodeResponse).toBe(200);
    });

    test("get reminder", async () => {
        const statusCodeResponse: number = await schedulingClient.getReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("create reminder", async () => {
        // TODO.
        const reminder: Reminder = new Reminder(
            "a",
            "*/15 * * * * *",
            "",
            0,
            {
                "url": "http://localhost:1111/"
            },
            {
                "topic": "test_topic"
            }
        );
        /*const reminder: Reminder = new Reminder();
        reminder.id = "a";
        reminder.time = "*!/15 * * * * *";
        reminder.payload = "";
        reminder.taskType = 0;
        reminder.httpPostTaskDetails = {
            "url": "http://localhost:1111/"
        };
        reminder.eventTaskDetails = {
            "topic": "test_topic"
        };*/
        const statusCodeResponse: number = await schedulingClient.createReminder(reminder);
        await expect(statusCodeResponse).toBe(200);
    });

    test("delete reminder", async () => {
        const statusCodeResponse: number = await schedulingClient.deleteReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("delete reminders", async () => {
        const statusCodeResponse: number = await schedulingClient.deleteReminders();
        await expect(statusCodeResponse).toBe(200);
    });
});
