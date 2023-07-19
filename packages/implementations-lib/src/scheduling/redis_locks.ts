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
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import Client from "ioredis";
import Redlock, {Lock} from "redlock";

export class RedisLocks implements ILocks {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly HOST_LOCKS: string;
    private readonly CLOCK_DRIFT_FACTOR: number;
    private readonly MAX_LOCK_SPINS: number;
    private readonly DELAY_MS_LOCK_SPINS: number;
    private readonly DELAY_MS_LOCK_SPINS_JITTER: number;
    private readonly THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION: number;
    // Other properties.
    private readonly redisClient: Client;
    private readonly redLock: Redlock;
    private readonly locks: Map<string, Lock>;

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
        this.HOST_LOCKS = HOST_LOCKS;
        this.CLOCK_DRIFT_FACTOR = CLOCK_DRIFT_FACTOR;
        this.MAX_LOCK_SPINS = MAX_LOCK_SPINS;
        this.DELAY_MS_LOCK_SPINS = DELAY_MS_LOCK_SPINS;
        this.DELAY_MS_LOCK_SPINS_JITTER = DELAY_MS_LOCK_SPINS_JITTER;
        this.THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION = THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION;

        this.redisClient = new Client({host: this.HOST_LOCKS});
        this.redLock = new Redlock(
            [this.redisClient], // TODO.
            {
                driftFactor: this.CLOCK_DRIFT_FACTOR,
                retryCount: this.MAX_LOCK_SPINS,
                retryDelay: this.DELAY_MS_LOCK_SPINS,
                retryJitter: this.DELAY_MS_LOCK_SPINS_JITTER,
                automaticExtensionThreshold: this.THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION
            }
        );
        this.locks = new Map<string, Lock>();
    }

    async acquire(lockId: string, lockDurationMs: number): Promise<boolean> {
        try {
            // acquire() throws if the lock can't be acquired.
            const lock: Lock = await this.redLock.acquire([lockId], lockDurationMs);
            this.locks.set(lockId, lock); // TODO.
            return true;
        } catch (e: unknown) {
            this.logger.debug(e);
            return false;
        }
    }

    async release(lockId: string): Promise<boolean> {
        const lock: Lock | undefined = this.locks.get(lockId);
        if (lock === undefined) {
            return false;
        }
        await lock.release();
        return true;
    }
}
