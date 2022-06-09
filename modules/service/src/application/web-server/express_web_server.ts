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

import express from "express";
import {ExpressRoutes} from "./express_routes";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Aggregate} from "../../domain/aggregate";

export class ExpressWebServer {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly HOST_WEB_SERVER: string;
    private readonly PORT_NO_WEB_SERVER: number;
    private readonly PATH_ROUTER: string;
    // Other properties.
    private readonly URL_WEB_SERVER_BASE: string;
    private readonly app: express.Express;
    private readonly routes: ExpressRoutes;

    constructor(
        logger: ILogger,
        HOST_WEB_SERVER: string,
        PORT_NO_WEB_SERVER: number,
        PATH_ROUTER: string,
        aggregate: Aggregate
    ) {
        this.logger = logger;
        this.HOST_WEB_SERVER = HOST_WEB_SERVER;
        this.PORT_NO_WEB_SERVER = PORT_NO_WEB_SERVER;
        this.PATH_ROUTER = PATH_ROUTER;

        this.URL_WEB_SERVER_BASE = `http://${this.HOST_WEB_SERVER}:${this.PORT_NO_WEB_SERVER}`;
        this.app = express();
        this.routes = new ExpressRoutes(
            logger,
            aggregate
        );

        this.configure();
    }

    private configure() {
        this.app.use(express.json()); // For parsing application/json.
        this.app.use(express.urlencoded({extended: true})); // For parsing application/x-www-form-urlencoded.
        this.app.use(this.PATH_ROUTER, this.routes.router);
    }

    start(): void {
        this.app.listen(this.PORT_NO_WEB_SERVER, () => {
            this.logger.info("Server on.");
            this.logger.info(`Host: ${this.HOST_WEB_SERVER}`);
            this.logger.info(`Port: ${this.PORT_NO_WEB_SERVER}`);
            this.logger.info(`Base URL: ${this.URL_WEB_SERVER_BASE}`);
        });
    }
}
