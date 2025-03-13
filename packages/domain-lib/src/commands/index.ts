/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Alfajiri
- Elijah Okello <elijahokello90@gmail.com>
*****/

"use strict";


import {randomUUID} from "crypto";
import {ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";
import {CommandMsg} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    SCHEDULING_BOUNDED_CONTEXT_NAME,
    SCHEDULING_AGGREGATE_NAME,
    SchedulingBcTopics,
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {Reminder, SingleReminder} from "../types";


export type CreateReminderCmdPayload = {
    id: string;
    time: string; // TODO: Date.
    payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };
}

export class CreateReminderCmd extends CommandMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string = SchedulingBcTopics.Commands;
    payload: CreateReminderCmdPayload;

    constructor(payload: CreateReminderCmdPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }

    validatePayload(): void {
        Reminder.validateReminder(this.payload);
    }

}


export type CreateSingleReminderCmdPayload = {
    id: string;
    time: string | number; // TODO: Date.
    payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    taskType: ReminderTaskType;
    httpPostTaskDetails: null | {
        url: string
    };
    eventTaskDetails: null | {
        topic: string
    };
}


export class CreateSingleReminderCmd extends CommandMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string = SchedulingBcTopics.Commands;
    payload: CreateSingleReminderCmdPayload;

    constructor(payload: CreateSingleReminderCmdPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }

    validatePayload(): void {
        SingleReminder.validateReminder(this.payload);
    }
}

export type DeleteReminderCmdPayload = {
    id: string;
}

export class DeleteReminderCmd extends CommandMsg {
    aggregateId: string;
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string = SchedulingBcTopics.Commands;
    payload: DeleteReminderCmdPayload;

    constructor(payload: DeleteReminderCmdPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }

    validatePayload(): void {
        // is validation needed?
    }

}


export class DeleteRemindersCmd extends CommandMsg {
    aggregateId: string;
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string = SchedulingBcTopics.Commands;
    payload: unknown;

    constructor() {
        super();
        this.aggregateId = this.msgKey = randomUUID();
    }

    validatePayload(): void {
        // is validation needed?
    }

}
