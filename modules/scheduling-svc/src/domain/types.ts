export class Reminder {
    id: string; // uuid. specified by the client; sent in the response.
    task: ReminderTask;
    time: string | Date;
}

// TODO: export?
export abstract class ReminderTask {
    taskType: ReminderTaskType;
    payload: any | null; // TODO: any?
}

export enum ReminderTaskType {
    HTTP_POST,
    EVENT // Kafka.
}

export class HTTPPost extends ReminderTask {
    uRL: string | null;
}

export class Event extends ReminderTask {
    topic: string | null;
    eventName: string | null;
}
