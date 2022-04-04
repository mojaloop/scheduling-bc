import {Reminder} from "./types";

export interface ISchedulingRepository {
    storeReminder(reminder: Reminder): Promise<void>;
    deleteReminder(reminderId: string): Promise<void>;
    reminderExists(reminderId: string): Promise<boolean>;
    getReminder(reminderId: string): Promise<Reminder>;
    getReminders(): Promise<Reminder[]>;
}
