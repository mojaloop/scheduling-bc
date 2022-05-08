"use strict";

import {ISchedulingLocks} from "../../src/domain/interfaces_infrastructure/ischeduling_locks";

// TODO: do these functions need to do anything?
export class MemorySchedulingLocks implements ISchedulingLocks {
    constructor() {
    }

    async acquire(lockId: string, durationMs: number): Promise<boolean> {
        return true;
    }

    async release(lockId: string): Promise<boolean> {
        return true;
    }
}
