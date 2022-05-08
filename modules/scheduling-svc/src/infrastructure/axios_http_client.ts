"use strict";

import {ISchedulingHTTPClient} from "../domain/interfaces_infrastructure/ischeduling_http_client";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import axios, {AxiosInstance} from "axios";

// By default, Axios throws if:
// - the server is unreachable;
// - the status code falls out of the 2xx range.

export class AxiosSchedulingHTTPClient implements ISchedulingHTTPClient {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    private readonly TIMEOUT_MS_HTTP_REQUEST: number;
    // Other properties.
    private readonly httpClient: AxiosInstance; // TODO: type.

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

    async post(url: string, payload: any): Promise<boolean> {
        // return Promise.resolve(false); // TODO.
        try {
            await this.httpClient.post(url, payload); // Return type: AxiosResponse<any>.
            return true;
        } catch (e: unknown) {
            this.logger.debug(e);
            return false;
        }
    }
}
