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
 - Okello Ivan Elijah <elijahokello90@gmail.com>

 --------------
 ******/

import { ConsoleLogger, ILogger } from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate, IRepo} from "../../src/index"
import { LockMock, MessageProducerMock, SchedulingRepoMock } from "../mocks/domain_lib_mocks";
import { ILocks } from "../../src/index";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IReminder, ISingleReminder, ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";
import { TransfersBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";


// Aggregate constructor arguments 
const logger: ILogger = new ConsoleLogger();
const repo: IRepo = new SchedulingRepoMock();
const locks: ILocks = new LockMock();
const messageProducer: IMessageProducer = new MessageProducerMock();

const aggregate = new Aggregate(logger,repo,locks,messageProducer,"UTC",10000,10000,10000);

describe("scheduling-bc domain lib tests", ()=>{

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async ()=>{
        await aggregate.destroy();
        jest.clearAllMocks();
    });
    test("scheduling bc- domain-lib: initialise aggregate - should pass ", async ()=>{
        // Act & Assert
        await expect(aggregate.init()).resolves;
    });

    test("scheduling bc- domain-lib: create reminder :should pass when you get the created reminder", async ()=>{
        // Arrange 
        const reminder: IReminder = {
            id: "3",
            time: "*/1 * * * * *",
            payload: {
                payload: {
                    name: "test"
                }
            },
            taskType: ReminderTaskType.EVENT,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": TransfersBCTopics.TimeoutEvents
            }
        }

        // Act
        const returnedReminderID = await aggregate.createReminder(reminder);
        const returnedReminder = await aggregate.getReminder(returnedReminderID);

        // Assert
        expect(returnedReminder?.id).toEqual(reminder.id);
    });

    test("scheduling bc- domain-lib: create reminder :should send event message through cronjob of reminder of type Event", async () => {
        // Arrange 
        const reminder: IReminder = {
            id: "3",
            time: "*/1 * * * * *",
            payload: {
                payload: {
                    name: "test"
                }
            },
            taskType: ReminderTaskType.EVENT,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": TransfersBCTopics.TimeoutEvents
            }
        }

        jest.spyOn(messageProducer, "send");

        // Act
        await aggregate.createReminder(reminder);

        await new Promise((r) => setTimeout(r, 1000));

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": reminder.payload.payload,
        }));
    });

    test("scheduling bc- domain-lib: create reminder :should not be able to send reminder due to reminder being locked", async () => {
        // Arrange 
        const reminder: IReminder = {
            id: "3",
            time: "*/1 * * * * *",
            payload: {
                payload: {
                    name: "test"
                }
            },
            taskType: ReminderTaskType.EVENT,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": TransfersBCTopics.TimeoutEvents
            }
        }

        jest.spyOn(locks, "acquire").mockResolvedValue(false);
        jest.spyOn(messageProducer, "send");

        // Act
        const returnedReminderID = await aggregate.createReminder(reminder);

        await new Promise((r) => setTimeout(r, 2000));

        const returnedReminder = await aggregate.getReminder(returnedReminderID);

        // Assert
        expect(messageProducer.send).not.toBeCalled();
        expect(returnedReminder).toEqual(reminder);
    });
    
    test("scheduling bc- domain-lib: get reminders :returned reminders should be greater than zero",async ()=>{
        // Act
        const reminders: IReminder[] = await aggregate.getReminders();

        // Assert
        expect(reminders.length).toBeGreaterThan(0);
    });

    test("scheduling bc- domain-lib: create single reminder: should pass when you get the created single reminder", async ()=>{
        // Arrange
        const singleReminder: ISingleReminder = {
            id: "4",
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
        const returnedReminderID = await aggregate.createSingleReminder(singleReminder);

        // Assert
        const returnedReminder = await aggregate.getReminder(returnedReminderID);
        expect(returnedReminder).toEqual(singleReminder);

    });

    test("scheduling bc- domain-lib: delete reminder :should delete when passed existent id", async ()=>{
        // Act
        await aggregate.deleteReminder("3");
        // Assert
        const reminder = await aggregate.getReminder("3");
        expect(reminder).toBeUndefined();
    });

    test("scheduling bc- domain-lib: delete reminders : should delete all reminders ",async ()=>{
        // Arrange
        await aggregate.deleteReminders();
        
        //Act
        const reminders: IReminder[] = await aggregate.getReminders();

        // Assert
        expect(reminders.length).toEqual(0);
    });
});