import axios, {AxiosInstance, AxiosResponse} from "axios";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {Reminder} from "../../dist/domain/types";

export class SchedulingClient {
    // Properties received through the constructor.
    private readonly logger: ILogger;
    // Other properties.
    private readonly httpClient: AxiosInstance; // TODO: type?

    constructor(
        logger: ILogger,
        TIMEOUT_MS_HTTP_REQUEST: number,
        URL_REMINDERS: string
    ) {
        this.logger = logger;

        this.httpClient = axios.create({
            baseURL: URL_REMINDERS,
            timeout: TIMEOUT_MS_HTTP_REQUEST,
        });
    }

    async getReminders(): Promise<number> { // TODO.
        try {
            const res: AxiosResponse<any> = await this.httpClient.get("/");
            return res.status;
        } catch (e: unknown) {
            this.logger.debug(e);
            return -1; // TODO.
        }
    }

    async getReminder(reminderId: string): Promise<number> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.get(`/${reminderId}`);
            return res.status;
        } catch (e: unknown) {
            this.logger.debug(e);
            return -1;
        }
    }

    async createReminder(reminder: Reminder): Promise<number> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.post(
                "/",
                reminder);
            return res.status;
        } catch (e: unknown) {
            this.logger.debug(e);
            return -1;
        }
    }

    async deleteReminder(reminderId: string): Promise<number> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.delete(`/${reminderId}`);
            return res.status;
        } catch (e: unknown) {
            this.logger.debug(e);
            return -1;
        }
    }

    async deleteReminders(): Promise<number> {
        try {
            const res: AxiosResponse<any> = await this.httpClient.delete("/");
            return res.status;
        } catch (e: unknown) {
            this.logger.debug(e);
            return -1;
        }
    }
}
