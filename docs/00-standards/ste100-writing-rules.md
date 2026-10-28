# ASD-STE100 rules for the text of the OJT-DTR project

This document gives the rules for all project text. The rules come from ASD-STE100 (Simplified Technical English). The official specification and dictionary are available from ASD at no cost (asd-ste100.org). The official specification is the authority. This document is a short project guide.

## 1. Scope

| Text | Apply STE? |
|---|---|
| Project documents in `docs/` | Yes |
| Agent memory files (`AGENTS.md`, `PROGRESS.md`) | Yes |
| Code comments and commit messages | Yes |
| UI labels and messages | Yes, when practical. Short labels can be fragments (for example, "Time in"). |
| Code, commands, file names, IDs, quoted standard names | No |

## 2. Word rules

1. Use approved words only with their approved meaning.
2. Use one word for one meaning. For example, always use "time-in". Do not also use "clock-in" or "check-in".
3. Use project technical names from section 6. You can use technical names that are not in the dictionary.
4. Use a verb as a verb and a noun as a noun. Do not use a noun as a verb.
5. Do not use noun clusters of more than three words. Break long clusters with "of", "for", or "in".
6. Do not use slang, jargon, or contractions.

### Common word substitutions

| Do not write | Write |
|---|---|
| utilize, leverage | use |
| ensure | make sure |
| perform | do |
| obtain | get |
| prior to | before |
| in order to | to |
| approximately | about |
| sufficient | enough |
| commence | start |
| terminate | stop |
| check (verb) | examine, make sure |
| via | through, with |

## 3. Verb rules

1. Use these tenses only: simple present, simple past, simple future.
2. Use the active voice. In descriptive text, you can use the passive voice when the agent is not known.
3. Use the imperative (command) form for instructions.
4. Do not use "-ing" forms, except in technical names (for example, "pull-to-refresh" or "rate limiting").

## 4. Sentence and paragraph rules

1. Procedural sentences: 20 words maximum.
2. Descriptive sentences: 25 words maximum.
3. Write one instruction in each sentence. Exception: two actions that occur at the same time.
4. Use articles ("a", "an", "the") and demonstratives ("this", "these"). Do not omit words to make a sentence shorter.
5. Write one topic in each paragraph. A paragraph has six sentences maximum.
6. Use vertical lists and tables for complex information.

## 5. Procedure and notice rules

1. Write each procedure as a numbered list of steps.
2. Put a condition before the instruction. Example: "If the network is not available, the app keeps the change in the outbox."
3. Put a notice immediately before the step that it applies to.
4. Use these notices:
   - **WARNING**: a risk of injury. (This project does not expect warnings.)
   - **CAUTION**: a risk of damage to data or equipment. Example: data loss.
   - **NOTE**: other important information.
5. Start a notice with a clear and simple command.

## 6. Project technical names

Use these names. Do not use synonyms.

| Technical name | Meaning |
|---|---|
| OJT | A trainee in on-the-job training. Also the user role of a trainee. |
| facilitator | The person who monitors and approves the records of a group of OJTs |
| admin | The user who manages the system |
| DTR | Daily time record |
| time-in | The punch that starts a work session |
| time-out | The punch that stops a work session |
| punch | One time-in or one time-out record |
| work session | One time-in and its time-out |
| logged hours | Hours from all closed work sessions |
| approved hours | Hours from the work sessions of approved weeks |
| remaining hours | Required hours minus approved hours |
| weekly report | The report of one OJT for one week (Monday to Sunday) |
| correction request | A request from an OJT to add or change a punch |
| batch | A group of OJTs in the same term, with the same required hours |
| host company | The company where the OJT does the training |
| local database | The SQLite database on the mobile device |
| outbox | The local table of changes that the app did not send to the server yet |
| sync | The process that sends outbox changes to the server and gets server changes |
| sync status | The state of a local record: `pending`, `synced`, or `issue` |
| sync issue | A change that the server did not accept |
| stage gate | The set of test criteria that must pass before the next stage starts |
| keep-alive | A call that keeps the Supabase project active |
| heartbeat | One keep-alive call, and the row that it writes |
| pause | The stop of a Free plan Supabase project after low activity |
| server epoch | The ID of the current backend data set. It changes after a rebuild. |
| Server not reachable | The app state when the network is available but the backend does not answer |
| RLS | Row Level Security: access rules on table rows in PostgreSQL |
| Missing time-out | The mark on a work session that has no time-out 16 hours (a setting) after its time-in (D-37) |

## 7. Self-check before you save a document

1. Examine each sentence for length.
2. Examine each instruction. It must use the imperative form.
3. Remove "-ing" forms that are not technical names.
4. Examine each term against section 6.
