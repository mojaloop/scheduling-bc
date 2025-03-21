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

* Alfajiri
- Okello Ivan Elijah <elijahokello90@gmail.com>
*****/

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    Aggregate,
    CreateReminderCmd,
    CreateSingleReminderCmd,
    DeleteReminderCmd, DeleteRemindersCmd,
    IHttpPostClient,
    ILocks,
    IRepo
} from "../../src";
import {LockMock, MessageProducerMock, SchedulingRepoMock} from "../mocks/domain_lib_mocks";
import {Reminder, SingleReminder} from "../../src";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IReminder, ISingleReminder, ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";
import {TransfersBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
    InvalidReminderTimeError,
    InvalidReminderTimeTypeError,
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "../../src";
import {FetchPostClient} from "@mojaloop/scheduling-bc-implementations-lib";

// Aggregate constructor arguments
const logger: ILogger = new ConsoleLogger();
const repo: IRepo = new SchedulingRepoMock();
const locks: ILocks = new LockMock();
const messageProducer: IMessageProducer = new MessageProducerMock();
const httpPostClient: IHttpPostClient = new FetchPostClient(logger);
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000;

const aggregate = new Aggregate(logger,repo,locks,httpPostClient,messageProducer,"UTC",10000,10000,TIMEOUT_MS_HTTP_CLIENT);

describe("scheduling-bc domain lib tests", ()=>{

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    afterAll(async ()=>{
        // destroy aggregate
        jest.clearAllMocks();
        await aggregate.destroy();
    });

    test("scheduling bc- domain-lib: initialise aggregate after populating reminder repo - should pass ", async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "1",
            time: "* * * * * *",
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
        await repo.storeReminder(reminder);

        // Assert
        await expect(aggregate.init()).resolves;
    });

    test("scheduling bc- domain-lib: initialise aggregate - should throw error when repo.getReminder fails ", async ()=>{
        // Arrange
        jest.spyOn(repo,"getReminders").mockImplementation(()=>{throw new Error()});
        // Act & Assert
        await expect(aggregate.init()).rejects.toThrowError();
    });

    test("scheduling bc- domain-lib: create reminder :should pass when you get the created reminder", async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "2",
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

        const createReminderCmd = new CreateReminderCmd(reminder);

        // Act
        await aggregate.processCmd(createReminderCmd);

        // Assert
        const returnedReminder = await aggregate.getReminder("2");
        expect(returnedReminder).toEqual(reminder);
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
        const createReminderCmd = new CreateReminderCmd(reminder);
        await aggregate.processCmd(createReminderCmd);

        await new Promise((r) => setTimeout(r, 2000));

        // Assert
        expect(messageProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            "payload": reminder.payload.payload,
        }));
    });

    test("scheduling bc- domain-lib: create reminder :should throw Error because of non existent topic", async () => {
        // Arrange
        const reminder: IReminder = {
            id: "10",
            time: "*/1 * * * * *",
            payload: {
                payload: {
                    name: "test-non-existent"
                }
            },
            taskType: ReminderTaskType.EVENT,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": "myTopic"
            }
        }
        const createReminderCmd = new CreateReminderCmd(reminder);

        jest.spyOn(messageProducer,"send");

        // Act
        await aggregate.processCmd(createReminderCmd);

        await new Promise((r) => setTimeout(r, 2000));

        // Assert
        expect(messageProducer.send).not.toHaveBeenCalledWith(expect.objectContaining({
            "payload": reminder.payload.payload,
        }));
    });

    test("scheduling bc- domain-lib: create reminder :should send http post message through cronjob of reminder of type post", async () => {
        // Arrange
        const reminder: IReminder = {
            id: "8",
            time: "*/1 * * * * *",
            payload: {
                payload: {
                    name: "test"
                }
            },
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {
                "url": "http://localhost:1111/"
            },
            eventTaskDetails: {
                "topic": TransfersBCTopics.TimeoutEvents
            }
        }
        const createReminderCmd = new CreateReminderCmd(reminder);
        jest.spyOn(logger,"error");

        // Act
        await aggregate.processCmd(createReminderCmd);
        await new Promise((resolve)=>{setTimeout(resolve, 1000)}); // wait for reminder to be triggered

        // Assert
        expect(logger.error).toHaveBeenCalled(); //this ensures logger.error was called since the http client will fail
    });

    test("scheduling bc- domain-lib: create reminder :should fail when storeReminder throws an error", async ()=>{
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

        const createReminderCmd = new CreateReminderCmd(reminder);
        jest.spyOn(repo,"storeReminder").mockImplementation(()=>{throw new ReminderAlreadyExistsError()});

        // Act & Assert
        await expect(aggregate.processCmd(createReminderCmd)).rejects.toThrowError(ReminderAlreadyExistsError);
    });

    test("scheduling bc- domain-lib: create reminder :should fail when storeReminder throws an error", async ()=>{
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

        const createReminderCmd = new CreateReminderCmd(reminder);
        jest.spyOn(repo,"storeReminder").mockImplementation(()=>{throw new Error()});

        // Act & Assert
        await expect(aggregate.processCmd(createReminderCmd)).rejects.toThrowError();
    });

    test("scheduling bc- domain-lib: create single reminder :should fail when storeReminder throws an error", async ()=>{
        // Arrange
        const reminder: ISingleReminder = {
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
        const createSingleReminderCmd = new CreateSingleReminderCmd(reminder);
        jest.spyOn(repo,"storeReminder").mockImplementation(()=>{throw new ReminderAlreadyExistsError()});

        // Act & Assert
        await expect(aggregate.processCmd(createSingleReminderCmd)).rejects.toThrowError(ReminderAlreadyExistsError);
    });

    test("scheduling bc- domain-lib: create single reminder :should fail when storeReminder throws an error", async ()=>{
        // Arrange
        const reminder: ISingleReminder = {
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
        const createSingleReminderCmd = new CreateSingleReminderCmd(reminder);
        jest.spyOn(repo,"storeReminder").mockImplementation(()=>{throw new Error()});

        // Act & Assert
        await expect(aggregate.processCmd(createSingleReminderCmd)).rejects.toThrowError();
    });

    test("scheduling-bc: domain-lib: create reminder should fail with return when getReminder returns null", async ()=>{
        // Arrange
        const reminder: IReminder = {
            id: "7",
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
        const createReminderCmd = new CreateReminderCmd(reminder);
        jest.spyOn(repo, "getReminder").mockImplementation(async ()=>{return null});

        // Act
        await aggregate.processCmd(createReminderCmd);

        await new Promise((r) => setTimeout(r, 1000));

        jest.resetAllMocks();
        // Assert
        const returnedReminder = aggregate.getReminder("7");
        expect(returnedReminder).toBeNull
    });

    test("scheduling bc- domain-lib: get reminders :returned reminders should be greater than zero",async ()=>{
        // Act
        const reminders: IReminder[] = await aggregate.getReminders();

        // Assert
        expect(reminders.length).toBeGreaterThan(0);
    });

    test("scheduling-bc - domain-lib: get reminder with id should fail when repo.getReminder fails", async ()=>{
        // Arrange
        jest.spyOn(repo,"getReminder").mockImplementation(async ()=>{throw new Error()});

        // Act and Asser
        await expect(aggregate.getReminder("1")).rejects.toThrowError();
    });

    test("scheduling bc- domain-lib: create reminder :should not be able to send reminder due to reminder being locked", async () => {
        // Arrange
        const reminder: IReminder = {
            id: "5",
            time: "* * * * * *",
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
        const createSingleReminderCmd = new CreateSingleReminderCmd(reminder);
        await aggregate.processCmd(createSingleReminderCmd);

        await new Promise((r) => setTimeout(r, 2000));

        const returnedReminder = await aggregate.getReminder("5");

        // Assert
        expect(messageProducer.send).not.toBeCalled();
        expect(returnedReminder).toEqual(reminder);
    });

    test("scheduling-bc - domain-lib: get reminders should fail when repo.getReminders fails", async ()=>{
        // Arrange
        jest.spyOn(repo,"getReminders").mockImplementation(async ()=>{throw new Error()});

        // Act and Asser
        await expect(aggregate.getReminders()).rejects.toThrowError();
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

        const createSingleReminderCmd = new CreateSingleReminderCmd(singleReminder);
        // Act
        await aggregate.processCmd(createSingleReminderCmd);

        // Assert
        const returnedReminder = await aggregate.getReminder("4");
        expect(returnedReminder).toEqual(singleReminder);

    });

    test("scheduling bc- domain-lib: delete reminder :should delete when passed existent id", async ()=>{
        // Act
        const deleteReminderCmd = new DeleteReminderCmd({id:"3"});
        await aggregate.processCmd(deleteReminderCmd);

        // Assert
        const reminder = await aggregate.getReminder("3");
        expect(reminder).toBeUndefined();
    });

    test("scheduling-bc - domain-lib: delete reminder with id should fail when repo.deleteReminder fails", async ()=>{
        // Arrange
        jest.spyOn(repo, "deleteReminder").mockImplementation(async ()=>{throw new NoSuchReminderError()});

        // Act & Assert
        const deleteReminderCmd = new DeleteReminderCmd({id:"3"});
        await expect(aggregate.processCmd(deleteReminderCmd)).rejects.toThrowError(NoSuchReminderError);
    });

    test("scheduling-bc - domain-lib: delete reminder with id should fail when repo.deleteReminder fails", async ()=>{
        // Arrange
        jest.spyOn(repo, "deleteReminder").mockImplementation(async ()=>{throw new Error()});

        // Act & Assert
        const deleteReminderCmd = new DeleteReminderCmd({id:"3"});
        await expect(aggregate.processCmd(deleteReminderCmd)).rejects.toThrowError(Error);
    });

    test("scheduling bc- domain-lib: delete reminders : should delete all reminders ",async ()=>{
        // Arrange
        const deleteRemindersCmd = new DeleteRemindersCmd();
        await aggregate.processCmd(deleteRemindersCmd);

        //Act
        const reminders: IReminder[] = await aggregate.getReminders();

        // Assert
        expect(reminders.length).toEqual(0);
    });

    test("scheduling-bc - domain-lib: delete reminders should fail when repo.deleteReminder fails", async ()=>{
        // Arrange
        const reminder: IReminder = new Reminder(
            "16",
            "* * * * * *",
            {},
            ReminderTaskType.EVENT,
            {"url": "http://localhost:1111/"},
            {"topic": "test_topic"}
        );
        const createReminderCmd = new CreateReminderCmd(reminder);
        await aggregate.processCmd(createReminderCmd);

        jest.spyOn(repo, "deleteReminder").mockImplementation(async ()=>{throw new NoSuchReminderError()});

        // Act & Assert
        const deleteCmd = new DeleteRemindersCmd();
        await expect(aggregate.processCmd(deleteCmd)).rejects.toThrowError(NoSuchReminderError);
    });

    test("scheduling-bc - domain-lib: delete reminders should fail when repo.deleteReminder fails", async ()=>{
        // Act and Assert
        expect(new Reminder(
            undefined,
            "* * * * * *",
            undefined,
            ReminderTaskType.EVENT,
            undefined,
            undefined
        )).resolves;

        expect(new SingleReminder(
            undefined,
            "* * * * * *",
            undefined,
            ReminderTaskType.EVENT,
            undefined,
            undefined
        )).resolves;

    });

    test("scheduling-bc - domain-lib: delete reminders should fail when repo.deleteReminder fails", async ()=>{
        // Arrange
        const reminder: IReminder = new Reminder(
            "11",
            "* * * * * *",
            {},
            ReminderTaskType.EVENT,
            {"url": "http://localhost:1111/"},
            {"topic": "test_topic"}
        );
        const createReminderCmd = new CreateReminderCmd(reminder);
        await aggregate.processCmd(createReminderCmd);

        jest.spyOn(repo, "deleteReminder").mockImplementation(async ()=>{throw new Error()});

        // Act & Assert
        const deleteRemindersCmd = new DeleteRemindersCmd();
        await expect(aggregate.processCmd(deleteRemindersCmd)).rejects.toThrowError(Error);
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

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with an invalid id should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: 3,
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": "http://localhost:1111/"},
            eventTaskDetails: {"topic": "test_topic"}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with undefined attributes should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: undefined,
            time: undefined,
            payload: undefined,
            taskType: undefined,
            httpPostTaskDetails: {"url": undefined},
            eventTaskDetails: {"topic": undefined}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with undefined attributes should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: "16",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": undefined},
            eventTaskDetails: {"topic": undefined}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with invalid time should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: "3",
            time: {},
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": "http://localhost:1111/"},
            eventTaskDetails: {"topic": "test_topic"}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError(InvalidReminderTimeTypeError);
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError(InvalidReminderTimeTypeError);
    });

    test("scheduling-bc - domain-lib: validate a reminder with invalid time should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: "3",
            time: "Rosetta",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": "http://localhost:1111/"},
            eventTaskDetails: {"topic": "test_topic"}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError(InvalidReminderTimeError);
    });

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with an invalid task type should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: "3",
            time: "* * * * * *",
            payload: {},
            taskType: {},
            httpPostTaskDetails: {"url": "http://localhost:1111/"},
            eventTaskDetails: {"topic": "test_topic"}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

    test("scheduling-bc - domain-lib: validate a reminder and a  reminder with an invalid task type should throw an exception", async ()=>{
        //Arrange
        const invalidReminder: any = {
            id: "3",
            time: "* * * * * *",
            payload: {},
            taskType: "TASK",
            httpPostTaskDetails: {"url": "http://localhost:1111/"},
            eventTaskDetails: {"topic": "test_topic"}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

    test("scheduling-bc - domain-lib: validate a reminder and a single reminder with an invalid httpPostUrl should throw an exception", async ()=>{
        // Arrange
        const invalidReminder: any = {
            id: "3",
            time: "* * * * * *",
            payload: {},
            taskType: ReminderTaskType.HTTP_POST,
            httpPostTaskDetails: {"url": 1},
            eventTaskDetails: {"topic": 1}
        };

        // Act and Assert
        expect(()=>{Reminder.validateReminder(invalidReminder)}).toThrowError();
        expect(()=>{SingleReminder.validateReminder(invalidReminder)}).toThrowError();
    });

});
