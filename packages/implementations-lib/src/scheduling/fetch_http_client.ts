/// <reference lib="dom" />
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

* Alfajiri
- Elijah Okello <elijahokello90@gmail.com>
*****/

"use strict";

import {IHttpPostClient} from "@mojaloop/scheduling-bc-domain-lib";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class FetchPostClient implements IHttpPostClient {
    private _defaultHeaders: Headers;
    private _logger:ILogger;
    private _controller: AbortController;

    constructor(logger:ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._controller = new AbortController();
        this._defaultHeaders = new Headers();
        this._defaultHeaders.append("Content-Type","application/json");
    }

    async destroy(): Promise<void> {
        this._controller.abort();
        return Promise.resolve(undefined);
    }

    async init(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async send( url: string, payload:unknown, timeout_ms: number): Promise<void> {
        try {
            const reqInit: RequestInit = {
                method:"POST",
                headers:this._defaultHeaders,
                body: JSON.stringify(payload),
                signal:this._controller.signal
            };
            const timeoutId =  setTimeout(()=>this._controller.abort(),timeout_ms);

            await fetch(url,reqInit);

            clearTimeout(timeoutId);
        }catch (e) {
            this._logger.error(e);
            throw e;
        }
    }

}
