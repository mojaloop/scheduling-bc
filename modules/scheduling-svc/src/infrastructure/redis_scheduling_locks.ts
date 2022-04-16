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

    constructor(
        hostLocks: string) {

        this.logger = new ConsoleLogger();

        this.HOST_LOCKS = hostLocks;

        this.redisClient = new Client({host: this.HOST_LOCKS});
        this.redLock = new Redlock(
            [this.redisClient], // TODO.
            {
                driftFactor: 0.01,
                retryCount: 10,
                retryDelay: 200,
                retryJitter: 200,
                automaticExtensionThreshold: 500
            }
        );
        this.map = new Map<string, Lock>();
    }

    /*async init(): Promise<void> {
        // return Promise.resolve(undefined); // TODO.
        throw new Error("not implemented yet")
    }*/

    async acquire(lockId: string, durationMs: number): Promise<boolean> {
        try {
            this.map.set(
                lockId,
                await this.redLock.acquire([lockId], durationMs)
            );
            return true;
        } catch (e: any) { // An exception is thrown if the lock can't be acquired.
            this.logger.debug("unable to acquire the lock");
            return false;
        }
    }

    async release(lockId: string): Promise<boolean> {
        await this.map.get(lockId)?.release(); // TODO: ?.
        return true;
    }
}
