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
*****/

"use strict";

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {IMessageConsumer, IMessageProducer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {SchedulingEventHandler} from "./handler";
import configClient from "./config";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {
    MLKafkaJsonConsumer,
    MLKafkaJsonProducer,
    MLKafkaJsonConsumerOptions,
    MLKafkaJsonProducerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";


const BC_NAME = configClient.boundedContextName;
const APP_NAME = configClient.applicationName;
const APP_VERSION = configClient.applicationVersion;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";
const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

const SERVICE_START_TIMEOUT_MS = 30_000;

const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

const kafkaProducerOptions: MLKafkaJsonProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

let globalLogger: ILogger;
export class Service {
    static logger: ILogger;
    static messageConsumer: IMessageConsumer;
    static messageProducer: IMessageProducer;
    static handler: SchedulingEventHandler;
    static startupTimer: NodeJS.Timeout;

    static async start(
        logger?: ILogger,
        messageConsumer?: IMessageConsumer,
        messageProducer?: IMessageProducer
    ):Promise<void>{
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

        if (!logger) {
            logger = new KafkaLogger(
                BC_NAME,
                APP_NAME,
                APP_VERSION,
                kafkaProducerOptions,
                KAFKA_LOGS_TOPIC,
                LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        if(!messageConsumer){
            const consumerHandlerLogger = logger.createChild("handlerConsumer");
            consumerHandlerLogger.setLogLevel(LogLevel.INFO);
            messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, consumerHandlerLogger);
        }
        this.messageConsumer = messageConsumer;

        if (!messageProducer) {
            const producerLogger = logger.createChild("producerLogger");
            producerLogger.setLogLevel(LogLevel.INFO);
            messageProducer = new MLKafkaJsonProducer(kafkaProducerOptions, producerLogger);
        }
        this.messageProducer = messageProducer;

        // create scheduling event handler and start it
        this.handler = new SchedulingEventHandler(this.logger, this.messageConsumer, this.messageProducer);
        await this.handler.start();

        this.logger.info(`Scheduling Event Handler Service started, version: ${configClient.applicationVersion}`);

        // remove startup timeout
        clearTimeout(this.startupTimer);
    }

    static async stop() {
        if (this.handler) await this.handler.stop();
        if (this.messageConsumer) await this.messageConsumer.destroy(true);
        if (this.messageProducer) await this.messageProducer.destroy();

        if (this.logger && this.logger instanceof KafkaLogger) await this.logger.destroy();
    }
}

/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(() => {
        clean_exit || process.exit(99);
    }, 5000);

    // call graceful stop routine
    await Service.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
    globalLogger.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
