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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import nock from "nock";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ILocks, IRepo,} from "@mojaloop/scheduling-bc-domain-lib";
import { IMessageProducer, IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IReminder} from "@mojaloop/scheduling-bc-public-types-lib";
import {IAuthorizationClient, ITokenHelper} from "@mojaloop/security-bc-public-types-lib";

export class SchedulingRepoMock implements IRepo {
    private reminders:Record<string, IReminder> = {};

    deleteReminder(reminderId: string): Promise<void> {
        delete this.reminders[reminderId]
        return Promise.resolve(undefined);
    }

    destroy(): Promise<void> {
        return Promise.resolve(undefined);
    }

    getReminder(reminderId: string): Promise<IReminder | null> {
        return Promise.resolve(this.reminders[reminderId]);
    }

    getReminders(): Promise<IReminder[]> {
        return Promise.resolve([]);
    }

    init(): Promise<void> {
        return Promise.resolve(undefined);
    }

    reminderExists(reminderId: string): Promise<boolean> {
        return Promise.resolve(reminderId in this.reminders);
    }

    storeReminder(reminder: IReminder): Promise<void> {
        this.reminders[reminder.id] = reminder;
        return Promise.resolve(undefined);
    }

}

export class MessageProducerMock implements IMessageProducer {
    connect(): Promise<void> {
        return Promise.resolve(undefined);
    }

    destroy(): Promise<void> {
        return Promise.resolve(undefined);
    }

    disconnect(): Promise<void> {
        return Promise.resolve(undefined);
    }

    send(message: IMessage | IMessage[]): Promise<void> {
        return Promise.resolve(undefined);
    }

}

export class LockMock implements ILocks {
    acquire(lockId: string, durationMs: number): Promise<boolean> {
        return Promise.resolve(false);
    }

    release(lockId: string): Promise<boolean> {
        return Promise.resolve(false);
    }

}

export class AuthorizationClientMock implements IAuthorizationClient {
    addPrivilege(privId: string, labelName: string, description: string): void {
    }

    addPrivilegesArray(privsArray: { privId: string; labelName: string; description: string }[]): void {
    }

    roleHasPrivilege(roleId: string, privilegeId: string): boolean {
        return false;
    }

}

export class TokenHelperMock  implements ITokenHelper {
    private _logger: ILogger;
    private _jwksUrl: string;
    private _issuerName: string;
    private _audience:string;
    private _jwksClient:string;
    init(): Promise<void> {
        return Promise.resolve();
    }
    decodeToken(accessToken: string) {
        return Promise.resolve();
    }
    verifyToken(accessToken: string): Promise<boolean> {
        return Promise.resolve(true);
    }
}