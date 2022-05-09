"use strict";

// TODO: implements anything? functions IMessageProducer interface.
import {IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";

export class MemorySchedulingMessageProducer implements IMessageProducer{
    constructor() {
    }

    async connect(): Promise<void> {
    }

    async destroy(): Promise<void> {
    }

    async send(message: any): Promise<void> {
    }

    async disconnect(): Promise<void> {
    }
}
