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

import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import axios, {AxiosInstance, AxiosResponse, AxiosError} from "axios";
import {IReminder} from "@mojaloop/scheduling-bc-private-types-lib";
import {UnableToCreateReminderError, UnableToDeleteReminderError, UnableToGetReminderError} from "./errors";

export class SchedulingClient {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    // Other properties.
    private readonly httpClient: AxiosInstance;

    constructor(
        logger: ILogger,
        URL_REMINDERS: string,
        TIMEOUT_MS_HTTP_CLIENT: number
    ) {
        this.logger = logger;

        this.httpClient = axios.create({
            baseURL: URL_REMINDERS,
            timeout: TIMEOUT_MS_HTTP_CLIENT
        });
    }

    async createReminder(reminder: IReminder): Promise<string> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.post("/", reminder);
            return res.data;
        } catch(e: unknown) {
            this.logger.error(e);
            if (axios.isAxiosError(e)) {
                throw new UnableToCreateReminderError(
                    (e as AxiosError).response?.data.message // TODO: receive a string?
                );
            }
            throw new UnableToCreateReminderError(); // TODO.
        }
    }

    async getReminder(reminderId: string): Promise<IReminder> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.get(`/${reminderId}`);
            return res.data;
        } catch(e: unknown) {
            this.logger.error(e);
            if (axios.isAxiosError(e)) {
                throw new UnableToGetReminderError(
                    (e as AxiosError).response?.data.message // TODO: receive a string?
                );
            }
            throw new UnableToGetReminderError(); // TODO.
        }
    }

    async deleteReminder(reminderId: string): Promise<void> {
        try {
            await this.httpClient.delete(`/${reminderId}`);
        } catch (e: unknown) {
            this.logger.error(e);
            if (axios.isAxiosError(e)) {
                throw new UnableToDeleteReminderError(
                    (e as AxiosError).response?.data.message // TODO: receive a string?
                );
            }
            throw new UnableToDeleteReminderError(); // TODO.
        }
    }
}
