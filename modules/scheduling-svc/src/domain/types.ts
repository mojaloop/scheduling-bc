export class Reminder {
    id: null | string; // UUId. specified by the client; sent in the response. TODO: or null?
    time: string | Date;
    payload: any;
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };
}

// TODO: export?
export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}
