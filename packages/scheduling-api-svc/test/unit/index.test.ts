/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>

* Gonçalo Garcia <goncalogarcia99@gmail.com>

* Elijah Okello <elijahokello90@gmail.com>
*****/

"use strict";
import { IRawMessageProducer } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {Service }from "../../src/application/service"
import { SchedulingRepoMock, MessageProducerMock, LockMock, TokenHelperMock, AuthorizationClientMock} from "./mocks/scheduling_svc_mocks";
import { ILocks, IRepo } from "@mojaloop/scheduling-bc-domain-lib";
import { IAuthorizationClient, ITokenHelper } from "@mojaloop/security-bc-public-types-lib";
import { ConsoleLogger, ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";


// Create service start params
const logger: ILogger = new ConsoleLogger();
const mockRepo: IRepo = new SchedulingRepoMock();
const mockMessageProducer: IRawMessageProducer = new MessageProducerMock();
const mockLocks: ILocks = new LockMock();
const tokenhelperMock: ITokenHelper = new TokenHelperMock();
const authorizationClientMock: IAuthorizationClient = new AuthorizationClientMock();

// http request settings
const DefaultHeaders = new Headers();
DefaultHeaders.append("Content-Type", "application/json");
const BASE_URL: string = "http://localhost:3150";

describe("scheduling-bc - scheduling-api-svc tests",()=>{
    beforeAll(async ()=>{
        // Start the scheduling service
        await Service.start(
            mockRepo,
            tokenhelperMock,
            logger,
            mockMessageProducer,
            authorizationClientMock,
            mockLocks
        ).then(() => {
            console.log("Started scheduling service");
        });
    });

    beforeEach(()=>{
        // restore all mocks
        jest.restoreAllMocks();
    });

    afterAll(async ()=>{
        // Stop the service
        await Service.stop().then(()=>{
            console.log("Service has been stopped.")
        });
    });

    test("scheduling-bc - scheduling-api-svc : create reminder should pass", async ()=>{
        // Arrange
        const reminder = {
            id: "1",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": "http://localhost:1000/remind"},
            eventTaskDetails: {"topic": "test-topic"}
        }

        const reqInit: RequestInit = {
            method: "POST",
            headers: DefaultHeaders,
            body: JSON.stringify(reminder)
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/`,reqInit);

        // Assert
        expect(response.status).toEqual(200);
    });

    test("scheduling-bc - scheduling-api-svc : get reminder should get 404 when getting a reminder that was created since there is no existing command handler", async ()=>{
        // Arrange
        const reminderID: number = 1;
        const reqInit: RequestInit = {
            method: "GET",
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/${reminderID}`,reqInit);

        // Assert
        expect(response.status).toEqual(404);
    });

    test("scheduling-bc - scheduling-api-svc: get health should pass when server is up", async ()=>{
        // Arrange
        const reqInit: RequestInit = {
            method: "GET"
        };

        // Act
        const response = await fetch(`${BASE_URL}/health`,reqInit);

        // Assert
        const body = await response.json();

        expect(body.status).toEqual("OK");
    });

    test("scheduling-bc - scheduling-api-svc: get non existent endpoint should return 404", async ()=>{
        // Arrange
        const reqInit: RequestInit = {
            method: "GET"
        };

        // Act
        const response = await fetch(`${BASE_URL}/healthy`,reqInit);

        // Assert
        expect(response.status).toEqual(404);
    });

    test("scheduling-bc - scheduling-api-svc: create single reminder with non existent id should pass", async ()=>{
        // Arrange
        const reminder = {
            id: "2",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": "http://localhost:1000/remind"},
            eventTaskDetails: {"topic": "test-topic"}
        }

        const reqInit: RequestInit = {
            method: "POST",
            headers: DefaultHeaders,
            body: JSON.stringify(reminder)
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/single`,reqInit)

        // Assert
        expect(response.status).toEqual(200);
    });

    test("scheduling-bc - scheduling-api-svc: get reminders should pass when reminders have been created", async ()=>{
        // Arrange
        const reqInit: RequestInit = {
            method: "GET"
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/`,reqInit);

        // Assert
        expect(response.status).toEqual(200);
    });

    test("scheduling-bc - scheduling-api-svc: delete reminder should pass when given an existent id", async ()=>{
        // Arrange
        const reminderID = 1;
        const reqInit: RequestInit = {
            method: "DELETE"
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/${reminderID}/`,reqInit);

        // Assert
        expect(response.status).toEqual(200);
    });

    test("scheduling-bc - scheduling-api-svc: delete reminders should pass when reminders were created prior", async ()=>{
        // Arrange
        const reqInit: RequestInit = {
            method: "DELETE"
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/`,reqInit);

        // Assert
        expect(response.status).toEqual(200);
    });

    // NON HAPPY PATHS
    test("scheduling-bc - scheduling-api-svc : get reminder should fail when repo getReminder fails ", async ()=>{
        // Arrange
        const reminderID: number = 1;
        const reqInit: RequestInit = {
            method: "GET",
        }

        jest.spyOn(mockRepo,"getReminder").mockImplementation(()=>{throw new Error();});
        // Act
        const response = await fetch(`${BASE_URL}/reminders/${reminderID}`,reqInit);

        // Assert
        expect(response.status).toEqual(500);
    });

    test("scheduling-bc - scheduling-api-svc : get reminder that does not exist should fail", async ()=>{
        // Arrange
        const reminderID: number = 22;
        const reqInit: RequestInit = {
            method: "GET",
        }

        // Act
        const response = await fetch(`${BASE_URL}/reminders/${reminderID}`,reqInit);

        // Assert
        expect(response.status).toEqual(404);
    });

    test("scheduling-bc - scheduling-api-svc: get reminders should fail when repo getReminders throws error", async ()=>{
        // Arrange
        const reqInit: RequestInit = {
            method: "GET"
        }

        jest.spyOn(mockRepo,"getReminders").mockImplementation(()=>{throw new Error();});

        // Act
        const response = await fetch(`${BASE_URL}/reminders/`,reqInit);

        // Assert
        expect(response.status).toEqual(500);
    });

});
