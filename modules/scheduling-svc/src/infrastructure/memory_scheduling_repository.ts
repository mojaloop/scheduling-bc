"use strict";

import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {Reminder} from "../domain/types";
import {NoSuchReminderError} from "../domain/errors";

export class MemorySchedulingRepository implements ISchedulingRepository {
    private map: Map<string, Reminder>;

    constructor() {
        this.map = new Map();
    }

    async init(): Promise<void> {
        throw new Error("not implemented");
    }

    async storeReminder(reminder: Reminder): Promise<void> {
        this.map.set(<string>reminder.id, reminder); // TODO: <>string.
    }

    async deleteReminder(reminderId: string): Promise<void> { // TODO: return type.
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
