"use strict";

// TODO: why write all this?
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

    constructor(
        // eslint-disable-next-line @typescript-eslint/no-inferrable-types
        id: string = "", // TODO: disable this linter warning; who did this linter?
        time: string | Date,
        payload: any = null,
        taskType: ReminderTaskType,
        httpPostTaskDetails: null | {
            url: string
        } = null,
        eventTaskDetails: null | {
            topic: string
        } = null
    ) {
        this.id = id;
        this.time = time;
        this.payload = payload;
        this.taskType = taskType;
        this.httpPostTaskDetails = httpPostTaskDetails;
        this.eventTaskDetails = eventTaskDetails;
    }
}

export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}
