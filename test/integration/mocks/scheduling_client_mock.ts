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
import {IReminder} from "@mojaloop/scheduling-bc-public-types-lib";


// TODO: change name - might be confused with the actual scheduling client.
export class SchedulingClientMock { // TODO: name.
    // Properties received through the constructor.
    private readonly logger: ILogger;
    // Other properties.
    private readonly URL_REMINDERS:string;
    private readonly defaultHeaders:Headers;
    private readonly TIMEOUT_MS_HTTP_CLIENT: number;
    constructor(
        logger: ILogger,
        URL_REMINDERS: string,
        TIMEOUT_MS_HTTP_CLIENT: number,
    ) {
        this.logger = logger;

        this.TIMEOUT_MS_HTTP_CLIENT = TIMEOUT_MS_HTTP_CLIENT;
        this.URL_REMINDERS = URL_REMINDERS;
        this.defaultHeaders = new Headers();
        this.defaultHeaders.append("Content-Type","application/json");
    }

    async createReminder(reminder: IReminder): Promise<number> {
        try {
            const controller = new AbortController();

            const reqInit: RequestInit = {
                method:"POST",
                headers:this.defaultHeaders,
                body:JSON.stringify(reminder),
                signal:controller.signal
            };

            const timeoutId = setTimeout(()=> controller.abort(),this.TIMEOUT_MS_HTTP_CLIENT);

            const res = await fetch(`${this.URL_REMINDERS}/`,reqInit);

            clearTimeout(timeoutId);
            return res.status;
        } catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message
            this.logger.error(e);
            throw new Error(errorMessage);
        }
    }

    async getReminder(reminderId: string): Promise<number> {
        try {
            const controller = new AbortController();

            const reqInit:RequestInit = {
                method: "GET",
                signal:controller.signal
            };

            const timeoutId = setTimeout(()=> controller.abort(),this.TIMEOUT_MS_HTTP_CLIENT);

            const res = await fetch(`${this.URL_REMINDERS}/${reminderId}`,reqInit);

            clearTimeout(timeoutId);
            return res.status;
        } catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message
            this.logger.error(e);
            throw new Error(errorMessage);
        }
    }

    async getReminders(): Promise<number> {
        try {
            const controller = new AbortController();

            const reqInit:RequestInit = {
                method:"GET",
                signal:controller.signal
            };

            const timeoutId = setTimeout(()=> controller.abort(),this.TIMEOUT_MS_HTTP_CLIENT);

            const res = await fetch(`${this.URL_REMINDERS}/`,reqInit);

            clearTimeout(timeoutId);
            return res.status;
        } catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message
            this.logger.error(e);
            throw new Error(errorMessage);
        }
    }

    async deleteReminder(reminderId: string): Promise<number> {
        try {
            const controller = new AbortController();

            const reqInit:RequestInit = {
                method:"DELETE",
                signal: controller.signal
            };

            const timeoutId = setTimeout(()=>controller.abort(),this.TIMEOUT_MS_HTTP_CLIENT);

            const res = await fetch(`${this.URL_REMINDERS}/${reminderId}`,reqInit);

            clearTimeout(timeoutId);

            return res.status;
        } catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message
            this.logger.error(e);
            throw new Error(errorMessage);
        }
    }

    async deleteReminders(): Promise<number> {
        try {
            const controller = new AbortController();

            const reqInit:RequestInit = {
                method:"DELETE",
                signal:controller.signal
            };

            const timeoutId = setTimeout(()=>controller.abort(),this.TIMEOUT_MS_HTTP_CLIENT);

            const res = await fetch(`${this.URL_REMINDERS}/`,reqInit);

            clearTimeout(timeoutId);
            return res.status;
        } catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message
            this.logger.error(e);
            throw new Error(errorMessage);
        }
    }
}
