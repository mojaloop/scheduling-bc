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
import { Reminder, SingleReminder } from "../../src/types";
import { IMessageProducer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IReminder, ISingleReminder, ReminderTaskType } from "@mojaloop/scheduling-bc-public-types-lib";

jest.setTimeout(180000);
// Aggregate constructor arguments 
const logger: ILogger = new ConsoleLogger();
const repo: IRepo = new SchedulingRepoMock();
const locks: ILocks = new LockMock();
const messageProducer: IMessageProducer = new MessageProducerMock();

const aggregate = new Aggregate(logger,repo,locks,messageProducer,"UTC+3",10,10,10);

describe("scheduling-bc domain lib tests", ()=>{

    afterAll(async ()=>{
        // destroy aggregate
        await aggregate.destroy();
    });
    test("scheduling bc- domain-lib: initialise aggregate - should pass ", async ()=>{
        // Act & Assert
        await expect(aggregate.init()).resolves;
    });

    test("scheduling bc- domain-lib: create reminder :should pass when you get the created reminder", async ()=>{
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

        // Act
        const returnedReminderID = await aggregate.createReminder(reminder);
        await new Promise(resolve => setTimeout(resolve,20000));

        // Assert
        const returnedReminder = await aggregate.getReminder(returnedReminderID);
        expect(returnedReminder).toEqual(reminder);
        
    });

    test("scheduling bc- domain-lib: create reminder that already exists :should fail with an exception", async ()=>{
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

        // Act and Assert
        await expect(aggregate.createReminder(reminder)).rejects.toThrowError();
        
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

    test("scheduling-bc - domain-lib: create and validate reminder should pass", async ()=>{
        // Arrange 
        const reminder: IReminder = new Reminder(
            "3",
            "* * * * * *",
            {},
            ReminderTaskType.HTTP_POST,
            {"url": "http://localhost:1111/"},
            {"topic": "test_topic"}
        );

        // Act & Assert
        expect(Reminder.validateReminder(reminder)).resolves;
    });

    test("scheduling-bc - domain-lib: create and validate single reminder should pass", async ()=>{
        // Arrange 
        const reminder: ISingleReminder = new SingleReminder(
            "3",
            "* * * * * *",
            {},
            ReminderTaskType.HTTP_POST,
            {"url": "http://localhost:1111/"},
            {"topic": "test_topic"}
        );

        // Act & Assert
        expect(SingleReminder.validateReminder(reminder)).resolves;
    });
});