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

const logger: ILogger = new ConsoleLogger();
const schedulingRepo: IRepo = new SchedulingRepoMock();
const lock: ILocks = new LockMock();
const authorizationClient: IAuthorizationClient = new AuthorizationClientMock();
const messageProducer: IMessageProducer = new MessageProducerMock();
const tokenhelper: ITokenHelper = new TokenHelperMock();
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);
const faultySchedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    FAULTY_URL_REMINDERS,
    TIMEOUT_MS_HTTP_CLIENT
);

describe("scheduling client - unit tests", () => {
    beforeAll(()=>{
        // Start the scheduling service
        Service.start(
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

    afterAll(()=>{
        // Stop the service
        Service.stop().then(()=>{
            console.log("Service has been stopped.")
        });
    });

    test("scheduling-bc: client-lib: create reminder - should pass with correct arguments", async () => {
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

    test("scheduling-bc: client-lib: get reminder - should return null when given non existent ID", async ()=>{
        // Act and Assert
        const returnedReminder = await schedulingClient.getReminder("2");

        // Assert
        expect(returnedReminder).toBeUndefined();
    });

    test("scheduling-bc: client-lib: delete reminder - should return null when getting a deleted reminder", async ()=>{
        // Arrange
        await schedulingClient.deleteReminder("1");

        //Act
        const returnedReminder = await schedulingClient.getReminder("1");

        // Assert
        expect(returnedReminder).toBeUndefined();

    });

    test("scheduling-bc: client-lib: create single reminder - should return a single reminder on getReminder after creating a single reminder", async ()=>{
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

        schedulingClient.createReminder(singleReminder);

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
        await expect(faultySchedulingClient.createSingleReminder(reminder)).rejects;

    });

    test("scheduling-bc: client-lib: get reminder - should return null when given non existent ID", async ()=>{
         //Assert
        await expect(faultySchedulingClient.getReminder("2")).rejects;
    });

    test("scheduling-bc: client-lib: delete reminder - should return null when getting a deleted reminder", async ()=>{
        // Assert
        await expect(faultySchedulingClient.deleteReminder("1")).rejects;

    });

    test("scheduling-bc: client-lib: create single reminder - should return a single reminder on getReminder after creating a single reminder", async ()=>{
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

        await expect(faultySchedulingClient.createReminder(singleReminder)).rejects;
    });

});
