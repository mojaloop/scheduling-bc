"use strict";

import {ISchedulingLocks} from "../domain/ischeduling_locks";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import Client from "ioredis";
import Redlock, {Lock} from "redlock";

export class RedisSchedulingLocks implements ISchedulingLocks {
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
    private readonly map: Map<string, Lock>;

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
        this.map = new Map<string, Lock>();
    }

    async acquire(lockId: string, lockDurationMs: number): Promise<boolean> {
        try {
            this.map.set(
                lockId,
                await this.redLock.acquire([lockId], lockDurationMs)
            );
            return true;
        } catch (e: unknown) { // An exception is thrown if the lock can't be acquired.
            this.logger.debug("unable to acquire the lock");
            return false;
        }
    }

    async release(lockId: string): Promise<boolean> {
        await this.map.get(lockId)?.release(); // TODO: ?.
        return true;
    }
}
