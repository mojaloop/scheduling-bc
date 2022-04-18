import {ISchedulingHTTPClient} from "../domain/ischeduling_http_client";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import axios, {AxiosResponse} from "axios";

export class AxiosSchedulingHTTPClient implements ISchedulingHTTPClient {
    private readonly logger: ILogger;
    private readonly httpClient;

    private readonly TIMEOUT_MS_HTTP_REQUEST: number;

    constructor(logger: ILogger, timeoutMsHttpRequest: number) {
        this.logger = logger;

        this.TIMEOUT_MS_HTTP_REQUEST = timeoutMsHttpRequest;

        this.httpClient = axios.create({
            timeout: this.TIMEOUT_MS_HTTP_REQUEST,
        });
    }

    async post(url: string, payload: any): Promise<boolean> {
        // return Promise.resolve(false); // TODO.
        try {
            const res: AxiosResponse<any> = await this.httpClient.post(
                url,
                payload);
            this.logger.debug(res);
            return true;
        } catch (e: any) {
            return false;
        }
    }
}
