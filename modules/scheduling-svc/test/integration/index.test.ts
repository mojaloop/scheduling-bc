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
describe("TestGroup", () => {
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
        await expect(statusCodeResponse).toBe(200); // TODO.
    });

    test("get reminder", async () => {
        const statusCodeResponse: number = await schedulingClient.getReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("create reminder", async () => {
        // TODO.
        /*const reminder: Reminder = new Reminder(
            "a",
            "*!/15 * * * * *",
            "",
            0,
            {
                "url": "http://localhost:1111/"
            },
            {
                "topic": "test_topic"
            }
        );*/
        const reminder: Reminder = new Reminder();
        reminder.id = "a";
        reminder.time = "*/15 * * * * *";
        reminder.payload = "";
        reminder.taskType = 0;
        reminder.httpPostTaskDetails = {
            "url": "http://localhost:1111/"
        };
        reminder.eventTaskDetails = {
            "topic": "test_topic"
        };
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
