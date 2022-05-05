"use strict";

import {SchedulingClient} from "./scheduling_client";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../../dist/domain/types";

const TIMEOUT_MS_HTTP_REQUEST: number = 10_000;
const URL_REMINDERS: string = "localhost:1234/reminders";

const logger: ILogger = new ConsoleLogger();
const schedulingClient: SchedulingClient = new SchedulingClient(
    logger,
    TIMEOUT_MS_HTTP_REQUEST,
    URL_REMINDERS
);

// TODO: are tests run sequentially? file structure; how many tests?
describe("TestGroup", () => {
    beforeAll(async () => {
        await schedulingClient.deleteReminders();
    });
    beforeEach(async () => {
    });
    afterEach(async () => {
    });
    afterAll(async () => {
    });

    test("get reminders", async () => {
        const statusCodeResponse: number = await schedulingClient.getReminders();
        await expect(statusCodeResponse).toBe(200); // TODO.
    });

    test("get reminder", async () => {
        const statusCodeResponse: number = await schedulingClient.getReminder("a");
        await expect(statusCodeResponse).toBe(200);
    });

    test("create reminder", async () => {
        const reminder: Reminder = { // TODO: Reminder constructor.
            "id" : "a",
            "time": "*/15 * * * * *", // Every 15 seconds.
            "payload": "",
            "taskType": 0,
            "httpPostTaskDetails": {
                "url": "http://localhost:1111/"
            },
            "eventTaskDetails": {
                "topic": "test_topic"
            }
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
