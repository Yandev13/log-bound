// DTR settings (D-30: rules that can change are settings, not code). OJT and facilitator features use them.
export const DTR_SETTINGS = {
  /** FR-DTR-09, D-37: a session with no time-out this many hours after its time-in gets the "Missing time-out" mark. */
  missingTimeOutHours: 16,
  /** D-48: the maximum wait for the location of a punch (QR-PE-01). */
  locationWaitMs: 800,
  /** D-48: a device position of this age or less is good enough for a punch. */
  locationMaxAgeMs: 5 * 60_000,
} as const;
