/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import {ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";
import {DomainEventMsg} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {Reminder, SingleReminder} from "@mojaloop/scheduling-bc-domain-lib";

const SCHEDULING_BOUNDED_CONTEXT_NAME = "scheduling-bc";
const SCHEDULING_AGGREGATE_NAME = "scheduling-bc-domain-lib";

export declare enum SchedulingBcTopics{
    "Commands" = "SchedulingBcCommands",
    "DomainEvents" = "SchedulingBcEvents"
}

export type CreateReminderEvtPayload = {
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

export class CreateReminderEvt extends DomainEventMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string;
    payload: CreateReminderEvtPayload;

    constructor(payload: CreateReminderEvtPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }

    validatePayload(): void {
        Reminder.validateReminder(this.payload);
    }
}

export type CreateSingleReminderEvtPayload = {
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

export class CreateSingleReminderEvt extends DomainEventMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string;
    payload: CreateSingleReminderEvtPayload;

    constructor(payload: CreateSingleReminderEvtPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }
    validatePayload(): void {
        SingleReminder.validateReminder(this.payload);
    }

}

export type DeleteReminderEvtPayload = {
    id: string;
}

export class DeleteReminderEvt extends DomainEventMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string;
    payload: DeleteReminderEvtPayload;

    constructor(payload: DeleteReminderEvtPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }
    validatePayload(): void {
        // is there need to validate a string. Type enforced by DeleteReminderEvtPayload
    }

}

export type DeleteRemindersEvtPayload = {
    id:string;
}


export class DeleteRemindersEvt extends DomainEventMsg {
    aggregateName: string = SCHEDULING_AGGREGATE_NAME;
    aggregateId: string;
    boundedContextName: string = SCHEDULING_BOUNDED_CONTEXT_NAME;
    msgKey: string;
    msgTopic: string;
    payload: DeleteRemindersEvtPayload;

    constructor(payload: DeleteRemindersEvtPayload) {
        super();
        this.aggregateId = this.msgKey = payload.id;
        this.payload = payload;
    }

    validatePayload(): void {
        // Validation not needed?
    }

}
