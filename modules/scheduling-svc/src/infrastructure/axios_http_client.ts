import {ISchedulingHTTPClient} from "../domain/ischeduling_http_client";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import axios, {AxiosResponse} from "axios";

export class AxiosSchedulingHTTPClient implements ISchedulingHTTPClient {
    constructor(
        private readonly logger: ILogger,
        private readonly TIMEOUT_MS_HTTP_REQUEST: number
    ) {}

    private readonly httpClient = axios.create({
        timeout: this.TIMEOUT_MS_HTTP_REQUEST,
    });

    /* END PROPERTIES */

    async post(url: string, payload: any): Promise<boolean> {
        // return Promise.resolve(false); // TODO.
        try {
            const res: AxiosResponse<any> = await this.httpClient.post(
                url,
                payload);
            return true;
        } catch (e: any) {
            this.logger.debug(e);
            return false;
        }
    }
}
