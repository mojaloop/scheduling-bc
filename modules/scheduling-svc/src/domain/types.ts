export class Reminder {
    id: string; // uuid. specified by the client; sent in the response.
    taskType: ReminderTaskType;
    payload: any | null; // TODO: any?
    time: string | Date;
    hTTPDetails: null | {
        url: string
    };
    eventDetails: null | {
        topic: string,
        eventName: string
    };
}

export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}
