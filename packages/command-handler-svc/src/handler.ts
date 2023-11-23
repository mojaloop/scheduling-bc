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

 * Alfajiri
 - Elijah Okello <elijahokello90@gmail.com>

 --------------
 ******/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {IMessage,IMessageConsumer,MessageTypes} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { Aggregate as SchedulingAggregate } from "@mojaloop/scheduling-bc-domain-lib";
import {SchedulingBcTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";

export class SchedulingCommandHandler {
    private _logger: ILogger;
    private _auditClient: IAuditClient;
    private _messageConsumer: IMessageConsumer;
    private _schedulingAgg: SchedulingAggregate;

    constructor(
        logger: ILogger,
        auditClient:IAuditClient,
        messageConsumer:IMessageConsumer,
        agg:SchedulingAggregate,
    ){
        this._logger = logger.createChild(this.constructor.name);
        this._auditClient = auditClient;
        this._messageConsumer = messageConsumer;
        this._schedulingAgg = agg;
    }

    async start ():Promise<void>{
        this._messageConsumer.setTopics([SchedulingBcTopics.Commands]);
        this._messageConsumer.setCallbackFn(this._msgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
    }

    private async _msgHandler(message: IMessage):Promise<void>{
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise<void>(async (resolve)=>{
            this._logger.debug(`Got message in SchedulingCommandHandler with name: ${message.msgName}`);
            try{
                if(message.msgType !== MessageTypes.COMMAND){
                    return resolve();
                }
                await this._schedulingAgg.processCmd(message);
            }catch(err: unknown){
                this._logger.error(err, `SchedulingCommandHandler - processing command - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
            }finally {
                resolve();
            }
        });
    }

    async stop():Promise<void>{
        await this._messageConsumer.stop();
    }
}
