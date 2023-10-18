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

 - Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {SchedulingClient} from "../../src";
import {Service} from "../../../scheduling-svc/src/application/service"
import {
    SchedulingRepoMock,
    LockMock,
    AuthorizationClientMock,
    MessageProducerMock,
    TokenHelperMock
} from "./mocks/scheduling_service_mock";
import {ILocks, IRepo} from "@mojaloop/scheduling-bc-domain-lib";
import {IAuthorizationClient, ITokenHelper} from "@mojaloop/security-bc-public-types-lib";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IReminder, ISingleReminder, ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";

const URL_REMINDERS: string = "http://localhost:1234/reminders";
const FAULTY_URL_REMINDERS: string = "http://localhost:1000/reminders";
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;
const SHORT_TIMEOUT_MS_HTTP_CLIENT: number = 1;

const logger: ILogger = new ConsoleLogger();
const schedulingRepo: IRepo = new SchedulingRepoMock();
const lock: ILocks = new LockMock();
const authorizationClient: IAuthorizationClient = new AuthorizationClientMock();
const messageProducer: IMessageProducer = new MessageProducerMock();
const tokenhelper: ITokenHelper = new TokenHelperMock();

const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
);

const faultySchedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    FAULTY_URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);

const shortSchedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
    SHORT_TIMEOUT_MS_HTTP_CLIENT
);

describe("scheduling client - unit tests", () => {
    beforeAll(async ()=>{
        // Start the scheduling service
        await Service.start(
            schedulingRepo,
            tokenhelper,
            logger,
            messageProducer,
            authorizationClient,
            lock
        ).then(() => {
            console.log("Started scheduling service");
        });
    });

    afterAll(async ()=>{
        // Stop the service
        await Service.stop().then(()=>{
            console.log("Service has been stopped.")
        });
    });

    test("scheduling-bc: client-lib: create single reminder - should pass with correct arguments", async () => {
        // Arrange
        const reminder: ISingleReminder = {
            id: "1",
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
        // Act
        const reminderID:string = await schedulingClient.createSingleReminder(reminder);

        // Assert
        const returnedReminder = await schedulingClient.getReminder(reminderID);
        await expect(reminderID).toEqual(returnedReminder?.id);
    });

    test("scheduling-bc: client-lib: create single reminder with short time client- should pass with correct arguments", async () => {
        // Arrange
        const reminder: ISingleReminder = {
            id: "1",
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
        await expect(shortSchedulingClient.createSingleReminder(reminder)).rejects.toThrowError(); //request should be aborted
    });

    test("scheduling-bc: client-lib: create reminder that already exists - should fail with correct arguments", async () => {
        // Arrange
        const reminder: IReminder = {
            id: "1",
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
        expect(schedulingClient.createReminder(reminder)).rejects.toThrowError();
    });

    test("scheduling-bc: client-lib: create reminder with short timeout client - should fail with correct arguments", async () => {
        // Arrange
        const reminder: IReminder = {
            id: "3",
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
        expect(shortSchedulingClient.createReminder(reminder)).rejects.toThrowError(); //request should be aborted
    });

    test("scheduling-bc: client-lib: create single reminder that already exists - should fail with correct arguments", async () => {
        // Arrange
        const reminder: ISingleReminder = {
            id: "1",
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
        expect(schedulingClient.createSingleReminder(reminder)).rejects.toThrowError();
    });

    test("scheduling-bc: client-lib: get reminder - should return null when given non existent ID", async ()=>{
        // Act and Assert
        const returnedReminder = await schedulingClient.getReminder("2");

        // Assert
        expect(returnedReminder).toBeNull();
    });

    test("scheduling-bc: client-lib: delete reminder - should return null when getting a deleted reminder", async ()=>{
        // Arrange
        await schedulingClient.deleteReminder("1");

        //Act
        const returnedReminder = await schedulingClient.getReminder("1");

        // Assert
        expect(returnedReminder).toBeNull();

    });

    test("scheduling-bc: client-lib: create reminder - should return a reminder on getReminder after creating a reminder", async ()=>{
        // Arrange
        const singleReminder: IReminder = {
            id: "3",
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        };

        await schedulingClient.createReminder(singleReminder);

        // Act
        const returnedReminder = await schedulingClient.getReminder("3");

        // Assert
        expect(returnedReminder?.id).toEqual("3");
    });

    test("scheduling-bc: client-lib: create reminder with faulty client - should fail with correct arguments", async () => {
        // Arrange
        const reminder: ISingleReminder = {
            id: "1",
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
        await expect(faultySchedulingClient.createSingleReminder(reminder)).rejects.toThrow();

    });

    test("scheduling-bc: client-lib: get reminder with faulty client - should fail even when passed an ID", async ()=>{
         //Assert
        await expect(faultySchedulingClient.getReminder("2")).rejects.toThrow();
    });

    test("scheduling-bc: client-lib: get reminder with short timeout client - should fail even when passed an ID", async ()=>{
        //Assert
        await expect(shortSchedulingClient.getReminder("2")).rejects.toThrow();
    });

    test("scheduling-bc: client-lib: delete reminder with faulty client - should fail to delete", async ()=>{
        // Assert
        await expect(faultySchedulingClient.deleteReminder("1")).rejects.toThrow();
    });

    test("scheduling-bc: client-lib: delete reminder with short timeout client - should fail to delete", async ()=>{
        // Assert
        await expect(shortSchedulingClient.deleteReminder("1")).rejects.toThrow();

    });

    test("scheduling-bc: client-lib: delete reminder that does not exist - should fail to delete", async ()=>{
        // Assert
        await expect(schedulingClient.deleteReminder("200")).rejects.toThrow();

    });

    test("scheduling-bc: client-lib: create reminder with faulty client - should fail to create reminder", async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "3",
            time: "*/15 * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        };
        // Assert
        await expect(faultySchedulingClient.createReminder(reminder)).rejects.toThrow();
    });

});
