"use strict";

export class Reminder {
    id: undefined | null | string; // UUId. specified by the client; sent in the response. TODO: undefined? null?
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

export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}
