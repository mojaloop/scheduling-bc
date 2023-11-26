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

 * Alfajiri
 - Elijah Okello <elijahokello90@gmail.com>

 --------------
 ******/

"use strict";

import {Service} from "../../src/service";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    CreateReminderCmd,
    CreateReminderCmdPayload,
    CreateSingleReminderCmdPayload,
    ILocks,
    IRepo
} from "@mojaloop/scheduling-bc-domain-lib";
import {
    AuditClientMock,
    LockMock,
    MessageConsumerMock,
    MessageProducerMock,
    SchedulingRepoMock
} from "./mocks/command-handler-mocks";
import {IRawMessageProducer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IReminder, ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";


// Create service start params
const logger: ILogger = new ConsoleLogger();
const mockRepo: IRepo = new SchedulingRepoMock();
const mockMessageProducer: IRawMessageProducer = new MessageProducerMock();
const mockLocks: ILocks = new LockMock();
const mockMessageConsumer = new MessageConsumerMock();
const auditClientMock: IAuditClient = new AuditClientMock();

describe("scheduling-bc command-handler-svc unit tests", ()=>{
    beforeAll(async ()=>{
        await Service.start(
            logger,
            auditClientMock,
            mockMessageConsumer,
            mockMessageProducer,
            mockRepo,
            mockLocks
        );
    });

    afterAll(async ()=>{
        await Service.stop();
    });

    test("invoke msgHandler function should create a reminder in the repo",async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "1",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }

        const createReminderCmd = new CreateReminderCmd(reminder as CreateReminderCmdPayload);

        // Act
        await mockMessageConsumer.invokeHandler(createReminderCmd);

        // Assert
        const createdReminder = await mockRepo.getReminder('1');
        expect(createdReminder).toEqual(reminder);
    });

    test("invoke msgHandler function should fail if store repo method throws an exception",async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "2",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }

        const createReminderCmd = new CreateReminderCmd(reminder as CreateReminderCmdPayload);

        // Act
        jest.spyOn(mockRepo,"storeReminder").mockImplementation(()=>{throw new Error()});
        jest.spyOn(logger,"error");

        await mockMessageConsumer.invokeHandler(createReminderCmd);

        // Assert
        expect(logger.error).toHaveBeenCalled();

    });

    test("invoke msgHandler function should not create a reminder in the repo with wrong msgType",async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "3",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "test_topic"
            }
        }

        const createReminderCmd = new CreateReminderCmd(reminder as CreateReminderCmdPayload);
        createReminderCmd.msgType = MessageTypes.DOMAIN_EVENT

        // Act
        await mockMessageConsumer.invokeHandler(createReminderCmd);

        // Assert
        const createdReminder = await mockRepo.getReminder('3');
        expect(createdReminder).toBeNull();
    });
});

