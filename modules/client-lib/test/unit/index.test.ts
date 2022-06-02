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

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {REMINDER_ID, SchedulingServiceMock} from "./mocks/scheduling_service_mock";
import {UnableToCreateReminderError, UnableToDeleteReminderError, UnableToGetReminderError} from "../../src/errors";
import {SchedulingClient} from "../../src";
import {IReminder} from "@mojaloop/scheduling-bc-private-types-lib";

const URL_REMINDERS: string = "http://localhost:1234/reminders";
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const schedulingServiceMock: SchedulingServiceMock = new SchedulingServiceMock(
    logger,
    URL_REMINDERS
);
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);

describe("scheduling client - unit tests", () => {
    test("create non-existent reminder", async () => {
        // TODO.
    });

    test("create existent reminder", async () => {
        // TODO.
    });

    test("get non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        await expect(
            async () => {
                await schedulingClient.getReminder(reminderId);
            }
        ).rejects.toThrow(UnableToGetReminderError);
    });

    test("get existent reminder", async () => {
        const reminder: IReminder | null = await schedulingClient.getReminder(REMINDER_ID);
        expect(reminder?.id).toBe(REMINDER_ID);
    });

    test("delete non-existent reminder", async () => {
        const reminderId: string = Date.now().toString();
        await expect(
            async () => {
                await schedulingClient.deleteReminder(reminderId);
            }
        ).rejects.toThrow(UnableToDeleteReminderError);
    });

    test("delete existent reminder", async () => {
        await expect(
            async () => {
                await schedulingClient.deleteReminder(REMINDER_ID);
            }
        ).resolves; // TODO.
    });
});
