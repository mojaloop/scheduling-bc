import {ISchedulingRepository} from "../domain/ischeduling_repository";
import {Reminder} from "../domain/types";

export class MemorySchedulingRepository implements ISchedulingRepository {
    private map: Map<string, Reminder> = new Map<string, Reminder>();

    async storeReminder(reminder: Reminder): Promise<void> {
        try {
            this.map.set(reminder.id, reminder);
        } catch (err) {
            return Promise.reject();
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        try {
            //await this.reminders.deleteOne(reminderId);
        } catch (err) {
            return Promise.reject();
        }
    }

    async getReminder(reminderId:string): Promise<Reminder | null> {
        return this.map.get(reminderId) || null; // undefined if doesnt exist.
    }

    async getReminders(): Promise<Reminder[]> { // TODO: Array?
        /*try {
            return await this.reminders
                .find(
                    {}, // Query. All documents (entries) in the collection (reminders).
                    {projection: {_id: 0}}) // All reminders.
                .toArray();
        } catch (err) {
            return Promise.reject();
        }*/
        throw new Error("Not Implemented Yet")
    }
}
