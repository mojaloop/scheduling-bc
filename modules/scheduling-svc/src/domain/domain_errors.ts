"use strict";

export class MissingReminderPropertiesOrTaskDetailsError extends Error{}
export class InvalidReminderIdTypeError extends Error{}
export class InvalidReminderTimeTypeError extends Error{}
export class InvalidReminderTimeError extends Error{}
export class InvalidReminderTaskTypeTypeError extends Error{}
export class InvalidReminderTaskTypeError extends Error{}
export class InvalidReminderTaskDetailsTypeError extends Error{}

export class ReminderAlreadyExistsError extends Error{}
export class NoSuchReminderError extends Error{}

export class UnableToGetRemindersError extends Error{}
export class UnableToGetReminderError extends Error{}
export class UnableToDeleteReminderError extends Error{}
