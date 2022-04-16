"use strict";

import {Reminder} from "./types";

export interface ISchedulingRepository {
    init(): Promise<void>;
    reminderExists(reminderId: string): Promise<boolean>;
    storeReminder(reminder: Reminder): Promise<void>;
    deleteReminder(reminderId: string): Promise<void>;
    getReminder(reminderId: string): Promise<Reminder>;
    getReminders(): Promise<Reminder[]>;
}
