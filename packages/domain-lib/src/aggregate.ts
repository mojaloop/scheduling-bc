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

* Gonçalo Garcia <goncalogarcia99@gmail.com>
*****/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {CommandMsg, IMessage, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IReminder, ISingleReminder, ReminderTaskType} from "@mojaloop/scheduling-bc-public-types-lib";
import { Reminder, SingleReminder } from "./types";
import {CronJob} from "cron";
import {
    InvalidReminderIdTypeError,
    InvalidReminderTaskDetailsTypeError,
    NoSuchReminderError,
    ReminderAlreadyExistsError
} from "./errors";
import {IHttpPostClient, ILocks, IRepo} from "./interfaces/infrastructure";
import { TransferTimeoutEvt, TransfersBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import {CreateReminderCmd, CreateSingleReminderCmd, DeleteReminderCmd, DeleteRemindersCmd} from "./commands";
import {randomUUID} from "crypto";

// TODO: check error handling.
export class Aggregate {
	// Properties received through the constructor.
	private readonly logger: ILogger;
	private readonly repo: IRepo;
	private readonly locks: ILocks;
	private readonly messageProducer: IMessageProducer;
	private readonly TIME_ZONE: string;
	private readonly TIMEOUT_MS_LOCK_ACQUIRED: number;
	private readonly MIN_DURATION_MS_TASK: number;
	// Other properties.
	private readonly httpPostClient: IHttpPostClient;
    private readonly TIMEOUT_MS_HTTP_CLIENT: number;
	private readonly cronJobs: Map<string, CronJob>;

	constructor(
		logger: ILogger,
		repo: IRepo,
		locks: ILocks,
		httpPostClient: IHttpPostClient,
		messageProducer: IMessageProducer,
		TIME_ZONE: string,
		TIMEOUT_MS_LOCK_ACQUIRED: number,
		MIN_DURATION_MS_TASK: number,
        TIMEOUT_MS_HTTP_CLIENT: number,
	) {
		this.logger = logger;
		this.repo = repo;
		this.locks = locks;
		this.messageProducer = messageProducer;
		this.TIME_ZONE = TIME_ZONE;
		this.TIMEOUT_MS_LOCK_ACQUIRED = TIMEOUT_MS_LOCK_ACQUIRED;
		this.MIN_DURATION_MS_TASK = MIN_DURATION_MS_TASK;
		this.httpPostClient = httpPostClient;
        this.TIMEOUT_MS_HTTP_CLIENT = TIMEOUT_MS_HTTP_CLIENT;

		this.cronJobs = new Map<string, CronJob>();
	}

	async init(): Promise<void> {
		let reminders: IReminder[];
		// TODO.
		try {
			await this.messageProducer.connect(); // Throws if the producer is unreachable.
			await this.repo.init();
			reminders = await this.repo.getReminders();
		} catch (e: unknown) {
			this.logger.error(e);
			throw e;
		}

        // TODO ensure that if we have errored timers we ignore/remove them (like past due)
		reminders.forEach((reminder: IReminder) => {
			this.cronJobs.set(reminder.id, new CronJob(
				!isNaN(Date.parse(reminder.time)) ? new Date(reminder.time) : reminder.time,
				() => {
					this.runReminderTask(reminder.id);
				},
				null,
				true,
				this.TIME_ZONE
				));
		});
	}

    async processCmd(cmd: CommandMsg | IMessage): Promise<void> {
        try{
            switch (cmd.msgName) {
                case CreateReminderCmd.name:
                    // this cast is ok because createReminder validates the payload
                    await this._createReminder(cmd.payload as Reminder);
                    break;
                case CreateSingleReminderCmd.name:
                    await this._createSingleReminder(cmd.payload as SingleReminder);
                    break;
                case DeleteReminderCmd.name:
                    await this._deleteReminder(cmd.payload.id);
                    break;
                case DeleteRemindersCmd.name:
                    await this._deleteReminders();
                    break;
            }
        }catch (e:unknown) {
            this.logger.error(e);
            throw e;
        }
    }

	async destroy(): Promise<void> {
		this.cronJobs.forEach((cronJob: CronJob) => {
			cronJob.stop();
			// When running the unit tests - where no server (application) is present and the aggregate is tested with
			// infrastructure mocks - if the cron jobs aren't stopped, the process is never terminated.
		});
	}

	private async _createReminder(reminder: IReminder): Promise<string> { // TODO: Reminder or IReminder?
		// To facilitate the creation of reminders, undefined/null ids are accepted and converted to empty strings
		// (so that random UUIds are generated).
		// istanbul ignore if
		if (reminder.id === undefined || reminder.id === null) { // TODO.
			reminder.id = "";
		}
		Reminder.validateReminder(reminder);
		try {
			// istanbul ignore if
			if (reminder.id === "") {
				do {
					reminder.id = randomUUID();
				} while (await this.repo.reminderExists(reminder.id));
			}
			await this.repo.storeReminder(reminder);
		} catch (e: unknown) {
			if (e instanceof ReminderAlreadyExistsError) {
				throw new ReminderAlreadyExistsError();
			}
			this.logger.error(e);
			throw new Error();
		}
		this.cronJobs.set(reminder.id, new CronJob(
			reminder.time,
			() => {
				this.runReminderTask(reminder.id);
			},
			null,
			true,
			this.TIME_ZONE,
			));
		return reminder.id;
	}

	private async _createSingleReminder(reminder: ISingleReminder): Promise<string> {
		// istanbul ignore if
		if (reminder.id === undefined || reminder.id === null) {
			reminder.id = "";
		}
		SingleReminder.validateReminder(reminder);
		try {
			// istanbul ignore if
			if (reminder.id === "") {
				do {
					reminder.id = randomUUID();
				} while (await this.repo.reminderExists(reminder.id));
			}
			await this.repo.storeReminder(reminder as IReminder);
		} catch (e: unknown) {
			if (e instanceof ReminderAlreadyExistsError) {
				throw new ReminderAlreadyExistsError();
			}
			this.logger.error(e);
			throw new Error();
		}
		this.cronJobs.set(reminder.id, new CronJob(
			new Date(reminder.time),
			() => {
				this.runReminderTask(reminder.id);
			},
			null,
			true,
			this.TIME_ZONE,
			));
		return reminder.id;
	}


	// This function takes at least MIN_DURATION_MS_TASK to execute.
	// Duration of getReminder() + duration of httpPost()/event() <= TIMEOUT_MS_LOCK_ACQUIRED.
	private async runReminderTask(reminderId: string): Promise<void> {
		const startTime = Date.now();
		if (!(await this.locks.acquire(reminderId, this.TIMEOUT_MS_LOCK_ACQUIRED))) {
			return;
		}
		try {
			const reminder: IReminder | null = await this.repo.getReminder(reminderId);
			if (reminder === null) {
				this.logger.error("no such reminder"); // TODO.
				throw new NoSuchReminderError();
			}
			switch (reminder.taskType) {
				case ReminderTaskType.HTTP_POST:
					await this.sendHttpPost(reminder);
					break;
				case ReminderTaskType.EVENT:
					await this.sendEvent(reminder);
					break;
			}
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime < this.MIN_DURATION_MS_TASK) {
				await new Promise(resolve => setTimeout(resolve, this.MIN_DURATION_MS_TASK - elapsedTime));
			}
		} catch (e: unknown) {
			this.logger.error(e);
			return; // TODO: throw?
		} finally {
			await this.locks.release(reminderId);
		}
	}

	private async sendHttpPost(reminder: IReminder): Promise<void> { // TODO: Reminder or IReminder?
        if(!reminder.httpPostTaskDetails || !reminder.httpPostTaskDetails.url){
            throw new InvalidReminderTaskDetailsTypeError("Invalid HTTP Task details or URL");
        }

        try {
            await this.httpPostClient.send(
				reminder.httpPostTaskDetails.url,
				reminder.payload,
				this.TIMEOUT_MS_HTTP_CLIENT
			);
		} catch (e: unknown) {
            const errorMessage: string | undefined = (e as Error).message;
			this.logger.error(e); // TODO: necessary?
            throw new Error(errorMessage);
		}
	}

	private async sendEvent(reminder: IReminder): Promise<void> { // TODO: Reminder or IReminder?
		// TODO: check if throws.
		let timeoutEvent = null;

		if(reminder.eventTaskDetails?.topic === TransfersBCTopics.TimeoutEvents) {
			timeoutEvent = new TransferTimeoutEvt(reminder.payload.payload);
		}

		if(!timeoutEvent) {
			const errorMessage = `Unable to create reminder due to non-existent timeout topic: ${reminder.eventTaskDetails?.topic}`;
			this.logger.error(errorMessage);
			throw Error(errorMessage);
		}

		timeoutEvent.fspiopOpaqueState = reminder.payload.fspiopOpaqueState;

		await this.messageProducer.send(timeoutEvent);

		// Delete the reminder if it's a valid date, since we use it to schedule a one-time task
		const timestamp = Date.parse(reminder.time);
		if (!isNaN(timestamp)) {
			await this._deleteReminder(reminder.id);
		}

		return;
	}

	async getReminder(reminderId: string): Promise<IReminder | null> { // TODO: Reminder or IReminder?
		// istanbul ignore if
		if (typeof reminderId !== "string") { // TODO.
			throw new InvalidReminderIdTypeError();
		}
		try {
			return await this.repo.getReminder(reminderId);
		} catch (e: unknown) {
			this.logger.error(e);
			throw new Error();
		}
	}

	async getReminders(): Promise<IReminder[]> { // TODO: Reminder or IReminder?
		try {
			return await this.repo.getReminders();
		} catch (e: unknown) {
			this.logger.error(e);
			throw new Error();
		}
	}

	private async _deleteReminder(reminderId: string): Promise<void> {
		// istanbul ignore if
		if (typeof reminderId !== "string") { // TODO.
			throw new InvalidReminderIdTypeError();
		}
		try {
			// TODO: place everything here or just the deleteReminder() call?
			await this.repo.deleteReminder(reminderId);
		} catch (e: unknown) {
			if (e instanceof NoSuchReminderError) {
				throw new NoSuchReminderError();
			}
			this.logger.error(e);
			throw new Error();
		}
		const cronJob: CronJob | undefined = this.cronJobs.get(reminderId);
		if (cronJob === undefined) {
			return;
		}
		cronJob.stop();
		this.cronJobs.delete(reminderId);
	}

	private async _deleteReminders(): Promise<void> {
		for (const reminderId of this.cronJobs.keys()) { // TODO: const? of?
			try {
				// TODO: place everything here or just the deleteReminder() call?
				await this.repo.deleteReminder(reminderId);
			} catch (e: unknown) {
				if (e instanceof NoSuchReminderError) {
					throw new NoSuchReminderError();
				}
				this.logger.error(e);
				throw new Error();
			}
			const cronJob: CronJob | undefined = this.cronJobs.get(reminderId);
			if (cronJob === undefined) {
				continue;
			}
			cronJob.stop();
			this.cronJobs.delete(reminderId);
		}
	}

}
