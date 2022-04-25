"use strict";

import {ISchedulingRepository} from "../../src/domain/ischeduling_repository";
import {Reminder} from "../../src/domain/types";
import {NoSuchReminderError} from "../../src/domain/errors";

export class MemorySchedulingRepository implements ISchedulingRepository {
    constructor(
        private readonly map: Map<string, Reminder>
    ) {}

    async init(): Promise<void> {
        return;
    }

    async storeReminder(reminder: Reminder): Promise<void> {
        this.map.set(reminder.id, reminder);
    }

    async deleteReminder(reminderId: string): Promise<void> {
        if (!this.map.delete(reminderId)) { // TODO: other ways to write this.
            throw new NoSuchReminderError();
        }
    }

    async reminderExists(reminderId: string): Promise<boolean> {
        return this.map.has(reminderId);
    }

    async getReminder(reminderId:string): Promise<Reminder> {
        // return this.map.get(reminderId) || null;
        // TODO.
        const reminder: Reminder | undefined = this.map.get(reminderId);
        if (!reminder) {
            throw new NoSuchReminderError();
        }
        return reminder;
    }

    async getReminders(): Promise<Reminder[]> {
        return [...this.map.values()]; // TODO.
    }
}
