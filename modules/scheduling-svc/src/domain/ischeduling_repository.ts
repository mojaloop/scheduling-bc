import {Reminder} from "./types";

export interface ISchedulingRepository {
    storeReminder(reminder: Reminder): Promise<void>;
    deleteReminder(reminderId: string): Promise<void>;
    getReminder(reminderId: string): Promise<Reminder | null>;
    getReminders(): Promise<Reminder[]>;
}
