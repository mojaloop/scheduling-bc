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
import { IReminder, ISingleReminder } from "../../public-types-lib/";
import {fetchWithTimeOut} from "./utils";
import {
	UnableToCreateReminderError,
	UnableToDeleteReminderError,
	UnableToGetReminderError,
	UnableToReachServerError
} from "./errors";

const DEFAULT_TIMEOUT_MS = 10_000;

export class SchedulingClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly _baseUrlHttpService:string;
    private readonly _requestTimeoutMs: number;
    private readonly _remindersPath = "reminders";

	constructor(
		logger: ILogger,
		baseUrlHttpService: string,
        requestTimeoutMs = DEFAULT_TIMEOUT_MS
	) {
		this.logger = logger;

		this._baseUrlHttpService = baseUrlHttpService;
        this._requestTimeoutMs = requestTimeoutMs;
	}

	async createReminder(reminder: IReminder): Promise<string> {
		try {
            const headers = new Headers();
            headers.append("Content-Type","application/json");

			const res = await fetchWithTimeOut(
                `${this._baseUrlHttpService}/${this._remindersPath}/`,
                {
                    method:"POST",
                    headers: headers,
                    body:JSON.stringify(reminder)
                },
                this._requestTimeoutMs
            );

			const data = await res.json();
            // istanbul ignore if
			if(!data.reminderId){
				throw new UnableToCreateReminderError(data.message);
			}
			return data.reminderId;
		} catch (e: unknown) {
			const serverMessage: string | undefined = (e as Error).message;
			if( e instanceof UnableToCreateReminderError){
				this.logger.error(e);
				throw new UnableToCreateReminderError(serverMessage);
			}else{
				this.logger.error(e);
				throw new UnableToReachServerError();
			}
		}
	}

	async createSingleReminder(reminder: ISingleReminder): Promise<string> {
		try {
            const headers = new Headers();
            headers.append("Content-Type","application/json");

            const res = await fetchWithTimeOut(
                `${this._baseUrlHttpService}/${this._remindersPath}/single`,
                {
                    method:"POST",
                    headers: headers,
                    body:JSON.stringify(reminder)
                },
                this._requestTimeoutMs
            );

            const data = await res.json();

            // istanbul ignore if
            if(!data.reminderId){
                throw new UnableToCreateReminderError(data.message);
            }
            return data.reminderId;
		} catch (e: unknown) {
			const serverErrorMessage: string | undefined = (e as Error).message;
            if(e instanceof UnableToCreateReminderError){
                this.logger.error(e);
                throw new UnableToCreateReminderError(serverErrorMessage);
            }else{
                this.logger.error(e);
                throw new UnableToReachServerError(serverErrorMessage);
            }
		}
	}

	async getReminder(reminderId: string): Promise<IReminder | null> {
		try {
            const headers = new Headers();
            headers.append("Content-Type","application/json");

            const res = await fetchWithTimeOut(
                `${this._baseUrlHttpService}/${this._remindersPath}/${reminderId}`,
                {
                    method:"GET",
                    headers: headers,
                },
                this._requestTimeoutMs
            );

            if (res.status === 404) {
                return null;
            }
            const data = await res.json();
			return data.reminder;
		} catch (e: unknown) {
			const serverErrorMessage: string | undefined = (e as Error).message;
			throw new UnableToGetReminderError(serverErrorMessage); // TODO: receive a string?
		}
	}

	async deleteReminder(reminderId: string): Promise<void> {
		try {
            const headers = new Headers();
            headers.append("Content-Type","application/json");

            const res = await fetchWithTimeOut(
                `${this._baseUrlHttpService}/${this._remindersPath}/${reminderId}`,
                {
                    method:"DELETE",
                    headers: headers,
                },
                this._requestTimeoutMs
            );

            const data = await res.json();

            if(res.status != 200){
                throw new UnableToDeleteReminderError(data.message);
            }
		} catch (e: unknown) {
			const serverErrorMessage: string | undefined = (e as Error).message;

            if(e instanceof UnableToDeleteReminderError){
                this.logger.error(e);
                throw new UnableToDeleteReminderError(serverErrorMessage);
            }
			throw new UnableToReachServerError(serverErrorMessage); // TODO: receive a string?
		}
	}
}
