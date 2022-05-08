"use strict";

import {Reminder} from "./types";

export interface ISchedulingRepository {
    init(): Promise<boolean>;
    terminate(): Promise<boolean>;
    reminderExists(reminderId: string): Promise<boolean>;
    storeReminder(reminder: Reminder): Promise<boolean>;
    deleteReminder(reminderId: string): Promise<boolean>;
    getReminders(): Promise<Reminder[]>;
    getReminder(reminderId: string): Promise<Reminder | null>;
}
