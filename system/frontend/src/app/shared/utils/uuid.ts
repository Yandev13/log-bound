// Layer 0: the client makes the ID of each new record and operation (D-10).
export function newId(): string {
  return crypto.randomUUID();
}

/** The current time as ISO 8601 UTC text, for the local database. */
export function nowIso(): string {
  return new Date().toISOString();
}
