"use strict";

import {ISchedulingRepository} from "../../src/domain/interfaces_infrastructure/ischeduling_repository";
import {Reminder} from "../../src/domain/types";

export class MemorySchedulingRepository implements ISchedulingRepository {
    private readonly map: Map<string, Reminder>;

    constructor() {
        this.map = new Map<string, Reminder>();
    }

    async init(): Promise<boolean> {
        return true;
    }

    async destroy(): Promise<boolean> {
        return true;
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        return this.map.has(reminderId);
    }

    async storeReminder(reminder: Reminder): Promise<boolean> {
        this.map.set(reminder.id, reminder);
        return true;
    }

    async deleteReminder(reminderId: string): Promise<boolean> {
        return this.map.delete(reminderId);
    }

    async getReminders(): Promise<Reminder[]> {
        return [...this.map.values()]; // TODO.
    }

    async getReminder(reminderId: string): Promise<Reminder | null> {
        return this.map.get(reminderId) || null; // TODO: Elvis operator.
    }
}
