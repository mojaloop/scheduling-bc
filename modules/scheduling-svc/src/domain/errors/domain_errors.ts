"use strict";

// TODO: rename to errors_aggregate?
// TODO: license headers.

export class MissingEssentialReminderPropertiesOrTaskDetailsError extends Error{}
export class InvalidReminderIdTypeError extends Error{}
export class InvalidReminderTimeTypeError extends Error{}
export class InvalidReminderTimeError extends Error{}
export class InvalidReminderTaskTypeTypeError extends Error{}
export class InvalidReminderTaskTypeError extends Error{}
export class InvalidReminderTaskDetailsTypeError extends Error{}

export class ReminderAlreadyExistsError extends Error{}
export class NoSuchReminderError extends Error{}
