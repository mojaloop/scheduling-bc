"use strict";

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";

const logger: ILogger = new ConsoleLogger();

describe("TestGroup", () => {
    beforeAll(async () => {
        // Set up.
    });
    beforeEach(async () => {
        // Set up.
    });
    afterEach(async () => {
        // Cleanup.
    });
    afterAll(async () => {
        // Cleanup.
    });

    test("TestA", async () => {
        await expect(true);
    });
    test("TestB", async () => {
        await expect(true);
    });
});
