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
 - Elijah Okello <elijahokello90@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {
    IMessageConsumer,
    IMessageProducer,
    IMessage,
    CommandMsg
} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {SchedulingBcTopics, TransferPreparedEvt} from "@mojaloop/platform-shared-lib-public-messages-lib";

export class SchedulingEventHandler {
    private _logger: ILogger;
    private _messageConsumer: IMessageConsumer;
    private _messageProducer: IMessageProducer;

    constructor(logger:ILogger, messageConsumer:IMessageConsumer, messageProducer:IMessageProducer) {
        this._logger = logger.createChild(this.constructor.name);
        this._messageConsumer = messageConsumer;
        this._messageProducer = messageProducer;
    }

    async start(): Promise<void>{
        // connect to producer
        await this._messageProducer.connect();

        // create and start the consumer handler
        this._messageConsumer.setTopics([SchedulingBcTopics.DomainEvents]);

        this._messageConsumer.setCallbackFn(this._msgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
    }

    private async _msgHandler(message: IMessage): Promise<void>{
        this._logger.debug(`Got message in SchedulingEventHandler with name: ${message.msgName}`);
        try {
            const schedulingCmd: CommandMsg | null = null;

            if (message.msgName === TransferPreparedEvt.name){
                // empty
            }else{
                // don't care about this message and at best we debug
                this._logger.isDebugEnabled() && this._logger.debug(`SchedulingEventHandler - Skipping unknown event - msgName: ${message?.msgName} msgKey: ${message?.msgKey} msgId: ${message?.msgId}`);
            }


            if (schedulingCmd) {
                await this._messageProducer.send(schedulingCmd);
                this._logger.isDebugEnabled() && this._logger.debug(`SchedulingEventHandler - publishing cmd Finished - ${message?.msgName}:${message?.msgKey}:${message?.msgId}`);
            }
        }catch(err: unknown){
            this._logger.error(err, `SchedulingEventHandler - processing event - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
        }finally {
            await Promise.resolve();
        }
    }

    async stop():Promise<void>{
        await this._messageConsumer.stop();
    }
}
