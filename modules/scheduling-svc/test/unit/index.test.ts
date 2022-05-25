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

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IRepo} from "../../src/domain/infrastructure-interfaces/irepo";
import {ILocks} from "../../src/domain/infrastructure-interfaces/ilocks";
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {MemoryRepo} from "./mocks/memory_repo";
import {MemoryLocks} from "./mocks/memory_locks";
import {MemoryMessageProducer} from "./mocks/memory_message_producer";
import {Aggregate} from "../../src/domain/aggregate";

/* Constants. */
const NAME_SERVICE: string = "scheduling";
// Repository.
const HOST_REPO: string = process.env.SCHEDULING_HOST_REPO || "localhost";
const PORT_NO_REPO: number = parseInt(process.env.SCHEDULING_PORT_NO_REPO || "") || 27017;
const URL_REPO: string = `mongodb://${HOST_REPO}:${PORT_NO_REPO}`;
const NAME_DB: string = "scheduling";
const NAME_COLLECTION: string = "reminders";
// Locks.
const HOST_LOCKS: string = process.env.SCHEDULING_HOST_LOCKS || "localhost";
const MAX_LOCK_SPINS: number = 10; // Max number of attempts to acquire a lock. TODO.
const CLOCK_DRIFT_FACTOR: number = 0.01;
// Message producer.
const HOST_MESSAGE_BROKER: string = process.env.SCHEDULING_HOST_MESSAGE_BROKER || "localhost";
const PORT_NO_MESSAGE_BROKER: number = parseInt(process.env.SCHEDULING_PORT_NO_MESSAGE_BROKER || "") || 9092;
const URL_MESSAGE_BROKER: string = `${HOST_MESSAGE_BROKER}:${PORT_NO_MESSAGE_BROKER}`; // TODO: name.
const ID_MESSAGE_PRODUCER: string = NAME_SERVICE; // TODO: name.
// Time.
const TIME_ZONE: string = "UTC";
const TIMEOUT_MS_REPO_OPERATIONS: number = 10_000; // TODO.
const DELAY_MS_LOCK_SPINS: number = 200; // Time between acquire attempts. TODO.
const DELAY_MS_LOCK_SPINS_JITTER: number = 200; // TODO.
const THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION: number = 500; // TODO.
const TIMEOUT_MS_LOCK_ACQUIRED: number = 30_000; // TODO.
const MIN_DURATION_MS_TASK: number = 2_000; // TODO.
const TIMEOUT_MS_HTTP_CLIENT: number = 10_000; // TODO.
const TIMEOUT_MS_EVENT: number = 10_000; // TODO.

// Logger.
const logger: ILogger = new ConsoleLogger();
// Infrastructure.
const repo: IRepo = new MemoryRepo(
    logger,
    URL_REPO,
    NAME_DB,
    NAME_COLLECTION,
    TIMEOUT_MS_REPO_OPERATIONS
);
const locks: ILocks = new MemoryLocks(
    logger,
    HOST_LOCKS,
    CLOCK_DRIFT_FACTOR,
    MAX_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS,
    DELAY_MS_LOCK_SPINS_JITTER,
    THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION
);
const messageProducer: IMessageProducer = new MemoryMessageProducer( // TODO: timeout.
    {
        brokerList: URL_MESSAGE_BROKER,
        producerClientId: ID_MESSAGE_PRODUCER
    },
    logger
);
// Domain.
const aggregate: Aggregate = new Aggregate( // TODO: Aggregate?
    logger,
    repo,
    locks,
    messageProducer,
    TIME_ZONE,
    TIMEOUT_MS_LOCK_ACQUIRED,
    MIN_DURATION_MS_TASK,
    TIMEOUT_MS_HTTP_CLIENT
);

describe("scheduling client - unit tests", () => {
    beforeAll(async () => {
        await aggregate.init(); // The aggregate initializes all the dependencies.
    });

    afterAll(async () => {
        await aggregate.destroy(); // The aggregate destroys all the dependencies.
    });

    test("get reminders", async () => {
        // TODO: delete and create reminders first?
    });

    test("get reminder", async () => {
        // TODO: delete and create reminder first?
    });

    test("create reminder", async () => {
    });

    test("delete reminder", async () => {
    });

    test("delete reminders", async () => {
    });
});
