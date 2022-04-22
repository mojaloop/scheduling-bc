"use strict";

export class Reminder {
    id: string;
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
