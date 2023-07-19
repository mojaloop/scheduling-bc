/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

 "use strict";

 export class MissingEssentialReminderPropertiesOrTaskDetailsError extends Error{}
 export class InvalidReminderIdTypeError extends Error{}
 export class InvalidReminderTimeTypeError extends Error{}
 export class InvalidReminderTimeError extends Error{}
 export class InvalidReminderTaskTypeTypeError extends Error{}
 export class InvalidReminderTaskTypeError extends Error{}
 export class InvalidReminderTaskDetailsTypeError extends Error{}
 
 export class ReminderAlreadyExistsError extends Error{}
 export class NoSuchReminderError extends Error{}
 
 export class UnableToInitRepoError extends Error{}
 export class UnableToStoreReminderError extends Error{}
 export class UnableToGetReminderError extends Error{}
 export class UnableToGetRemindersError extends Error{}
 export class UnableToDeleteReminderError extends Error{}