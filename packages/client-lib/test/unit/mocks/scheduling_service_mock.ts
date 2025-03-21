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

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {ILocks, IRepo, NoSuchReminderError, ReminderAlreadyExistsError,} from "@mojaloop/scheduling-bc-domain-lib";
import { IMessageProducer, IMessage } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IReminder} from "@mojaloop/scheduling-bc-public-types-lib";
import {CallSecurityContext, IAuthorizationClient, ITokenHelper} from "@mojaloop/security-bc-public-types-lib";

export class SchedulingRepoMock implements IRepo {
    private reminders = new Map<String, IReminder>();

    deleteReminder(reminderId: string): Promise<void> {
        if (!this.reminders.has(reminderId)) {
            throw new NoSuchReminderError();
        }
        this.reminders.delete(reminderId);
        return Promise.resolve(undefined);
    }

    destroy(): Promise<void> {
        return Promise.resolve(undefined);
    }

    getReminder(reminderId: string): Promise<IReminder | null> {
        const reminder = this.reminders.get(reminderId);
        // check if reminder is undefined.
        if (!reminder) {
            return Promise.resolve(null);
        }
        return Promise.resolve(reminder);
    }

    getReminders(): Promise<IReminder[]> {
        var remindersList: IReminder [] = [];
        this.reminders.forEach(reminder => {
            remindersList.push(reminder)
        });
        return Promise.resolve(remindersList);
    }

    init(): Promise<void> {
        return Promise.resolve(undefined);
    }

    reminderExists(reminderId: string): Promise<boolean> {
        return Promise.resolve(this.reminders.has(reminderId));
    }

    storeReminder(reminder: IReminder): Promise<void> {
        if (this.reminders.has(reminder.id)) {
            throw new ReminderAlreadyExistsError();
        }
        this.reminders.set(reminder.id, reminder);
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
    init(): Promise<void> {
        return Promise.resolve();
    }

    destroy(): Promise<void> {
        return Promise.resolve();
    }

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

    rolesHavePrivilege(roleIds: string[], privilegeId: string): boolean {
        return false;
    }

}

export class TokenHelperMock implements ITokenHelper {
    private _logger: ILogger;
    private _jwksUrl: string;
    private _issuerName: string;
    private _audience:string;
    private _jwksClient:string;
    init(): Promise<void> {
        return Promise.resolve();
    }
    destroy(): Promise<void> {
        return Promise.resolve();
    }
    decodeToken(accessToken: string) {
        return Promise.resolve();
    }
    verifyToken(accessToken: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    getCallSecurityContextFromAccessToken(accessToken: string): Promise<CallSecurityContext | null> {
        throw new Error("Method not implemented.");
    }
}
