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

import { ILocks } from "@mojaloop/scheduling-bc-domain-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";

// TODO: test with multiple instances?
export class MemoryLocks implements ILocks {
    // Properties received through the constructor.
    private readonly logger: ILogger;

    constructor(
        logger: ILogger,
        HOST_LOCKS: string,
        CLOCK_DRIFT_FACTOR: number,
        MAX_LOCK_SPINS: number,
        DELAY_MS_LOCK_SPINS: number,
        DELAY_MS_LOCK_SPINS_JITTER: number,
        THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION: number
    ) {
        this.logger = logger;
    }

    async acquire(lockId: string, durationMs: number): Promise<boolean> {
        return true;
    }

    async release(lockId: string): Promise<boolean> {
        return true;
    }
}