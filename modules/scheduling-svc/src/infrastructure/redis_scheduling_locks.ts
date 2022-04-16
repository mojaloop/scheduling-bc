"use strict";

import {ISchedulingLocks} from "../domain/ischeduling_locks";
import Client from "ioredis";
import Redlock, {Lock} from "redlock";
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";

export class RedisSchedulingLocks implements ISchedulingLocks {
    private readonly logger: ILogger;
    private readonly redisClient: Client;
    private readonly redLock: Redlock;
    private readonly map: Map<string, Lock>;

    private readonly HOST_LOCKS: string;
    private readonly CLOCK_DRIFT_FACTOR: number;
    private readonly MAX_LOCK_SPINS: number;
    private readonly DELAY_MS_LOCK_SPINS: number;
    private readonly DELAY_MS_LOCK_SPINS_JITTER: number;
    private readonly THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION: number;
    private readonly TIMEOUT_MS_LOCK_HOLD: number;

    constructor(
        hostLocks: string,
        clockDriftFactor: number,
        maxLockSpins: number,
        delayMsLockSpins: number,
        delayMsLockSpinsJitter: number,
        thresholdMsLockAutomaticExtension: number) {

        this.logger = new ConsoleLogger();

        this.HOST_LOCKS = hostLocks;
        this.CLOCK_DRIFT_FACTOR = clockDriftFactor;
        this.MAX_LOCK_SPINS = maxLockSpins;
        this.DELAY_MS_LOCK_SPINS = delayMsLockSpins;
        this.DELAY_MS_LOCK_SPINS_JITTER = delayMsLockSpinsJitter;
        this.THRESHOLD_MS_LOCK_AUTOMATIC_EXTENSION = thresholdMsLockAutomaticExtension;
        this.TIMEOUT_MS_LOCK_HOLD =
            this.MAX_LOCK_SPINS * this.DELAY_MS_LOCK_SPINS + this.DELAY_MS_LOCK_SPINS; // TODO.

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

    /*async init(): Promise<void> {
        // return Promise.resolve(undefined); // TODO.
        throw new Error("not implemented yet")
    }*/

    async acquire(lockId: string, lockDurationMs: number): Promise<boolean> {
        try {
            this.map.set(
                lockId,
                await this.redLock.acquire([lockId], lockDurationMs)
            );
            return true;
        } catch (e: any) { // An exception is thrown if the lock can't be acquired.
            this.logger.debug("unable to acquire the lock");
            return false;
        }
    }

    async release(lockId: string): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, this.TIMEOUT_MS_LOCK_HOLD)); // TODO.
        await this.map.get(lockId)?.release(); // TODO: ?.
        return true;
    }
}
