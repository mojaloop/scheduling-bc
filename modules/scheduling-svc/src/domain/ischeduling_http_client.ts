"use strict";

export interface ISchedulingHTTPClient {
    post(url: string, payload: any): Promise<boolean>;
}
