"use strict";

export class ReminderAlreadyExistsError extends Error{}
export class NoSuchReminderError extends Error{}

export class MissingReminderPropertiesOrTaskDetailsError extends Error{}
export class InvalidReminderIdError extends Error{}
export class InvalidReminderTimeError extends Error{}
export class InvalidReminderTaskTypeError extends Error{}
export class InvalidReminderTaskDetailsError extends Error{}
