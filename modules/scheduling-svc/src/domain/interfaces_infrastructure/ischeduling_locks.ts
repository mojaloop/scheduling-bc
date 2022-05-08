"use strict";

export interface ISchedulingLocks {
    acquire(lockId: string, durationMs: number): Promise<boolean>;
    release(lockId: string): Promise<boolean>;
}
