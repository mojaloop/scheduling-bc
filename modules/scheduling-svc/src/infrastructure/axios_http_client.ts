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

 * Community
 - Gonçalo Garcia <goncalogarcia99@gmail.com>

 --------------
 ******/

"use strict";

import {IHTTPClient} from "../domain/infrastructure-interfaces/ihttp_client";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import axios, {AxiosInstance} from "axios";

// By default, Axios throws if:
// - the server is unreachable;
// - the status code falls out of the 2xx range.

export class AxiosHTTPClient implements IHTTPClient {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly TIMEOUT_MS_HTTP_REQUEST: number;
    // Other properties.
    private readonly httpClient: AxiosInstance;

    constructor(
        logger: ILogger,
        TIMEOUT_MS_HTTP_REQUEST: number
    ) {
        this.logger = logger;
        this.TIMEOUT_MS_HTTP_REQUEST = TIMEOUT_MS_HTTP_REQUEST;

        this.httpClient = axios.create({
            timeout: this.TIMEOUT_MS_HTTP_REQUEST,
        });
    }

    // TODO: error handling here or on the aggregate?
    async post(url: string, payload: any): Promise<boolean> {
        try {
            await this.httpClient.post(url, payload); // Return type: AxiosResponse<any>.
            return true;
        } catch (e: unknown) {
            this.logger.error(e);
            return false;
        }
    }
}
