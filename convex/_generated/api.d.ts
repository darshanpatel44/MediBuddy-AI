/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as asi1 from "../asi1.js";
import type * as audio from "../audio.js";
import type * as clinicalTrials from "../clinicalTrials.js";
import type * as consultations from "../consultations.js";
import type * as medicalEntityExtraction from "../medicalEntityExtraction.js";
import type * as medicalProfile from "../medicalProfile.js";
import type * as medicalReports from "../medicalReports.js";
import type * as meetings from "../meetings.js";
import type * as notifications from "../notifications.js";
import type * as trialMatching from "../trialMatching.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  asi1: typeof asi1;
  audio: typeof audio;
  clinicalTrials: typeof clinicalTrials;
  consultations: typeof consultations;
  medicalEntityExtraction: typeof medicalEntityExtraction;
  medicalProfile: typeof medicalProfile;
  medicalReports: typeof medicalReports;
  meetings: typeof meetings;
  notifications: typeof notifications;
  trialMatching: typeof trialMatching;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
