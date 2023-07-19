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
 import axios, {AxiosInstance, AxiosResponse, AxiosError} from "axios";
 import { IReminder } from "@mojaloop/scheduling-bc-domain-lib";
 import {
	 UnableToCreateReminderError,
	 UnableToDeleteReminderError,
	 UnableToGetReminderError,
	 UnableToReachServerError
 } from "./errors";
 
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
			 return res.data.reminderId;
		 } catch (e: any) {
			 const serverErrorMessage: string | undefined = e.response?.data.message;
			 if (serverErrorMessage === undefined) {
				 this.logger.error(e);
				 throw new UnableToReachServerError(); // TODO.
			 }
			 throw new UnableToCreateReminderError(serverErrorMessage); // TODO: receive a string?
		 }
	 }
 
	 async getReminder(reminderId: string): Promise<IReminder | null> {
		 try {
			 const res: AxiosResponse<any> = await this.httpClient.get(
				 `/${reminderId}`,
				 {
					 validateStatus: (statusCode: number) => {
						 return statusCode === 200 || statusCode === 404; // Resolve only 200s and 404s.
					 }
				 }
			 );
			 if (res.status === 404) {
				 return null;
			 }
			 return res.data.reminder;
		 } catch (e: any) {
			 const serverErrorMessage: string | undefined = e.response?.data.message;
			 if (serverErrorMessage === undefined) {
				 this.logger.error(e);
				 throw new UnableToReachServerError(); // TODO.
			 }
			 throw new UnableToGetReminderError(serverErrorMessage); // TODO: receive a string?
		 }
	 }
 
	 async deleteReminder(reminderId: string): Promise<void> {
		 try {
			 await this.httpClient.delete(`/${reminderId}`);
		 } catch (e: any) {
			 const serverErrorMessage: string | undefined = e.response?.data.message;
			 if (serverErrorMessage === undefined) {
				 this.logger.error(e);
				 throw new UnableToReachServerError(); // TODO.
			 }
			 throw new UnableToDeleteReminderError(serverErrorMessage); // TODO: receive a string?
		 }
	 }
 }
 