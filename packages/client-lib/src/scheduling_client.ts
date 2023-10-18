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

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import { IReminder, ISingleReminder } from "../../public-types-lib/";
import {fetchWithTimeOut} from "./utils";
import {
	UnableToCreateReminderError,
	UnableToDeleteReminderError,
	UnableToGetReminderError,
	UnableToReachServerError
} from "./errors";

export class SchedulingClient {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	// Other properties.
	private readonly URL_REMINDERS:string;
    private readonly TIMEOUT_MS_HTTP_CLIENT: number;

	constructor(
		logger: ILogger,
		URL_REMINDERS: string,
        TIMEOUT_MS_HTTP_CLIENT: number
	) {
		this.logger = logger;

		this.URL_REMINDERS = URL_REMINDERS;
        this.TIMEOUT_MS_HTTP_CLIENT = TIMEOUT_MS_HTTP_CLIENT;
	}

	async createReminder(reminder: IReminder): Promise<string> {
		try {
            const headers = new Headers();
            headers.append("Content-Type","application/json");

			const res = await fetchWithTimeOut(
                `${this.URL_REMINDERS}/`,
                {
                    method:"POST",
                    headers: headers,
                    body:JSON.stringify(reminder)
                },
                this.TIMEOUT_MS_HTTP_CLIENT
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
                `${this.URL_REMINDERS}/single`,
                {
                    method:"POST",
                    headers: headers,
                    body:JSON.stringify(reminder)
                },
                this.TIMEOUT_MS_HTTP_CLIENT
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
                `${this.URL_REMINDERS}/${reminderId}`,
                {
                    method:"GET",
                    headers: headers,
                },
                this.TIMEOUT_MS_HTTP_CLIENT
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
                `${this.URL_REMINDERS}/${reminderId}`,
                {
                    method:"DELETE",
                    headers: headers,
                },
                this.TIMEOUT_MS_HTTP_CLIENT
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
