// UI prototype: shared text of the new screens (D-31, frontend rule 13). The text of each role is in
// `strings-ojt.ts` and `strings-fac.ts`. Text follows ASD-STE100 where practical.
export const UI_STRINGS = {
  prototypeNote: 'Prototype: this screen uses sample data. The data does not sync yet.',
  status: {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    returned: 'Returned',
    pending: 'Pending',
    rejected: 'Rejected',
    none: 'No report',
  },
  header: {
    notifications: 'Notifications',
    profile: 'Profile',
  },
  /** "212.5 h" for 12,750 minutes. */
  hours: (minutes: number) => `${(Math.round((minutes / 60) * 10) / 10).toLocaleString('en-PH')} h`,
  /** "212.5 of 486 h". */
  hoursOf: (minutes: number, requiredMinutes: number) =>
    `${(Math.round((minutes / 60) * 10) / 10).toLocaleString('en-PH')} of ${Math.round(requiredMinutes / 60)} h`,
  weekdayShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
} as const;
