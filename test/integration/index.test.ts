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

import { SchedulingClient } from "../../packages/client-lib/src";
import { ConsoleLogger, ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { MongoRepo, RedisLocks } from "../../packages/implementations-lib/src/index";
import { UnableToCreateReminderError, UnableToDeleteReminderError } from "../../packages/client-lib/src/errors";
import { IReminder, ISingleReminder, ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";
import { Service } from "../../packages/scheduling-svc/src/application/service";
import {SchedulingClientMock} from "./mocks//scheduling_client_mock";
import {Reminder} from "@mojaloop/scheduling-bc-domain-lib";

// TODO: here or inside the describe function?
const URL_REMINDERS: string = "http://localhost:1234/reminders";
const INVALID_URL_REMINDERS: string = "http://localhost:1000/reminders";
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;

const logger: ILogger = new ConsoleLogger();
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
);

const invalidSchedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    INVALID_URL_REMINDERS,
);

const schedulingClientMock: SchedulingClientMock = new SchedulingClientMock(
    logger,
    URL_REMINDERS,
);

// CONFIG FOR MONGO
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
const DB_NAME = process.env.SCHEDULING_DB_NAME ?? "scheduling";
const TIMEOUT_MS_REPO_OPERATIONS = 10_000;
const mongoRepo = new MongoRepo(logger, MONGO_URL, DB_NAME, TIMEOUT_MS_REPO_OPERATIONS);


//CONFIG FOR REDIS
const HOST_LOCKS: string = process.env.SCHEDULING_HOST_LOCKS ?? "localhost";
const MAX_LOCK_SPINS = 10;
const CLOCK_DRIFT_FACTOR = 0.01;
const DELAY_MS_LOCK_SPINS = 200;
const DELAY_MS_LOCK_SPINS_JITTER = 200;
const THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION = 500;
const redislocks = new RedisLocks(
    logger,
    HOST_LOCKS,
    CLOCK_DRIFT_FACTOR,
    MAX_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS_JITTER,
    THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION
);
describe("scheduling client - integration tests", () => {
    beforeAll(async () => {
        await Service.start();
        await mongoRepo.init();
        await redislocks.init();

    });

    afterAll(async () => {
        await Service.stop();
        await mongoRepo.destroy();
        await redislocks.destroy();
    });

    test("scheduling client - integration tests : create non-existent reminder should pass ", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        const reminderIdReceived: string = await schedulingClient.createReminder(reminder);
        expect(reminderIdReceived).toBe(reminderIdExpected);
    });

    test("scheduling client - integration tests : create non-existent single reminder should pass ", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: ISingleReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        const reminderIdReceived: string = await schedulingClient.createSingleReminder(reminder);
        expect(reminderIdReceived).toBe(reminderIdExpected);
    });

    test("scheduling client - integration tests : create non-existent single reminder with invalid client should fail", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: ISingleReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        await expect(invalidSchedulingClient.createSingleReminder(reminder)).rejects.toThrowError();
    });

    test("scheduling client - integration tests :create existent reminder should throw error", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        const reminderIdReceived: string = await schedulingClient.createReminder(reminder);
        expect(reminderIdReceived).toBe(reminderIdExpected);
        await expect(
            async () => {
                await schedulingClient.createReminder(reminder);
            }
        ).rejects.toThrow(UnableToCreateReminderError); // TODO.
    });

    test("scheduling client - integration tests: get non-existent reminder should return null", async () => {
        const reminderId: string = Date.now().toString();
        const reminder: IReminder | null = await schedulingClient.getReminder(reminderId);
        expect(reminder).toBeNull();
    });

    test("scheduling client - integration tests: get reminder with invalid client should fail", async () => {
        const reminderId: string = Date.now().toString();
        await expect(invalidSchedulingClient.getReminder(reminderId)).rejects.toThrowError();

    });

    test("scheduling client - integration tests: get existent reminder should return reminder", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminderSent: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        const reminderIdReceived: string = await schedulingClient.createReminder(reminderSent);
        expect(reminderIdReceived).toBe(reminderIdExpected);
        const reminderReceived: IReminder | null = await schedulingClient.getReminder(reminderIdExpected);
        expect(reminderReceived?.id).toBe(reminderIdExpected);
    });

    test("scheduling client - integration tests: delete non-existent reminder should fail", async () => {
        const reminderId: string = Date.now().toString();
        await expect(
            async () => {
                await schedulingClient.deleteReminder(reminderId);
            }
        ).rejects.toThrow(UnableToDeleteReminderError);
    });

    test("scheduling client - integration tests: delete existent reminder should pass", async () => {
        const reminderIdExpected: string = Date.now().toString();
        const reminder: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }
        const reminderIdReceived: string = await schedulingClient.createReminder(reminder);
        expect(reminderIdReceived).toBe(reminderIdExpected);
        await expect(
            async () => {
                await schedulingClient.deleteReminder(reminderIdExpected);
            }
        ).resolves; // TODO.
    });

    test("scheduling-svc - integration tests: create non-existent reminder should pass", async () => {
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

    test("scheduling-svc - integration tests:  get non-existent reminder should return 404", async () => {
        const reminderId: string = Date.now().toString();
        const statusCodeResponse: number = await schedulingClientMock.getReminder(reminderId);
        expect(statusCodeResponse).toBe(404);
    });

    test("scheduling-svc - integration tests:  get non-existent endpoint should return 404", async () => {
        // Arrange
        const reqInit: RequestInit = {
            method: "GET"
        }

        // Act
        const response = await fetch("http://localhost:1234/foo",reqInit);

        // Assert
        expect(response.status).toBe(404);
    });

    test("scheduling-svc - integration tests: get existent reminder should return 200", async () => {
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

    test("scheduling-svc - integration tests: get reminders should return 200 if reminders exist", async () => {
        const statusCodeResponse: number = await schedulingClientMock.getReminders();
        expect(statusCodeResponse).toBe(200);
    });

    test("scheduling-svc - integration tests: delete existent reminder should return 200", async () => {
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

    test("scheduling-svc - integration tests:  delete reminders should pass with 200", async () => {
        const statusCodeResponse: number = await schedulingClientMock.deleteReminders();
        expect(statusCodeResponse).toBe(200);
    });

    test("implementation-lib :Mongo Repo - integration tests: store non existent reminder should pass",async ()=>{
        // Arrange
        const reminderIdExpected: string = "100";
        const reminder: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }

        // Act and Assert
        await expect(mongoRepo.storeReminder(reminder)).resolves;
    });

    test("implementation-lib :Mongo Repo - integration tests: store existent reminder should throw Error",async ()=>{
        // Arrange
        const reminderIdExpected: string = "100";
        const reminder: IReminder = { // TODO.
            id: reminderIdExpected,
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }

        // Act and Assert
        await expect(mongoRepo.storeReminder(reminder)).rejects.toThrowError();
    });

    test("implementation-lib :Mongo Repo - integration tests: get existent reminder should pass",async ()=>{
        // Act and Assert
        await expect(mongoRepo.getReminder("100")).resolves;
    });

    test("implementation-lib :Mongo Repo - integration tests: get non existent reminder should pass",async ()=>{
        // Act and Assert
        await expect(mongoRepo.getReminder("111")).resolves;
    });

    test("implementation-lib :Mongo Repo - integration tests: get reminders should pass",async ()=>{
        // Act and Assert
        await expect(mongoRepo.getReminders()).resolves;
    });

    test("implementation-lib :Mongo Repo - integration tests: delete reminder should pass",async ()=>{
        // Act and Assert
        await expect(mongoRepo.deleteReminder("100")).resolves;
    });

    test("implementation-lib :Mongo Repo - integration tests: delete non existent reminder should throw error",async ()=>{
        // Act and Assert
        await expect(mongoRepo.deleteReminder("2900")).rejects.toThrowError();
    });

    test("implementation-lib :Redis lock - integration tests: acquire lock should pass",async ()=>{
        // Act
        const lockStatus = await redislocks.acquire("transfer",1000);

        // Assert
        expect(lockStatus).toEqual(true);
    });

    test("implementation-lib :Redis lock - integration tests: release existent lock should pass",async ()=>{
         // Act
         const lockStatus = await redislocks.release("transfer");

         // Assert
         expect(lockStatus).toEqual(true);
    });

    test("implementation-lib :Redis lock - integration tests: release non existent lock should return false",async ()=>{
        // Act
        const lockStatus = await redislocks.release("foo");

        // Assert
        expect(lockStatus).toEqual(false);
   });

});
