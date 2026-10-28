# API contract

This document is the API contract of the OJT-DTR backend (D-23, QR-CO-02). It lists each table, RLS policy, RPC function, and Edge Function. Update it in the same commit as each change to the schema.

Status: S2, migrations `20261025134548_core_schema`, `20261025134615_restrict_anon_functions`, `20261026070655_sync_functions`, `20261026071035_strict_time_format`, and `20261026080316_attachments_storage`.

## 1. Interfaces

| Interface | Path | Format |
|---|---|---|
| Data API (PostgREST) | `/rest/v1/<table>` | REST with JSON. Supabase JWT in `Authorization`. Project key in `apikey`. |
| RPC | `/rest/v1/rpc/<function>` | POST with a JSON body |
| Auth | `/auth/v1/*` | Supabase Auth |
| Storage | `/storage/v1/object/attachments/<owner_id>/<id>.jpg` | Upload (POST) and download (GET). See section 3.1. |
| Edge Functions | `/functions/v1/<name>` | Not deployed yet (S3, S4) |

The Data API exposes only the `public` schema. The `private` and `ops` schemas are not exposed.

## 2. Grants

| Role | Grants |
|---|---|
| `anon` | No table access. EXECUTE on `heartbeat` only. |
| `authenticated` | SELECT on all `public` tables (RLS filters the rows). INSERT and UPDATE on `companies`, `batches`, `ojt_assignments`, `devices`. UPDATE on `profiles`. No DELETE. |

The mobile app writes only through `sync_push` (S2). Thus mobile roles have no other write path.

## 3. Tables and RLS policies

"Peer" means a person in an active assignment with the user (the facilitator of an OJT, or an OJT of a facilitator).

| Table | Policy | Action | Who |
|---|---|---|---|
| `profiles` | `profiles_select_own` | SELECT | Own row |
| | `profiles_select_peer` | SELECT | Peers (active OJT or facilitator only) |
| | `profiles_select_admin` | SELECT | Admin |
| | `profiles_update_admin` | UPDATE | Admin |
| `companies` | `companies_select_assigned` | SELECT | OJT and facilitator: companies of own active assignments |
| | `companies_select_admin`, `companies_insert_admin`, `companies_update_admin` | SELECT, INSERT, UPDATE | Admin |
| `batches` | `batches_select_assigned` | SELECT | OJT and facilitator: batches of own active assignments |
| | `batches_select_admin`, `batches_insert_admin`, `batches_update_admin` | SELECT, INSERT, UPDATE | Admin |
| `ojt_assignments` | `assignments_select_ojt` | SELECT | OJT: own assignments |
| | `assignments_select_facilitator` | SELECT | Facilitator: assignments where it is the facilitator |
| | `assignments_select_admin`, `assignments_insert_admin`, `assignments_update_admin` | SELECT, INSERT, UPDATE | Admin |
| `punches` | `punches_select` | SELECT | The OJT, its active facilitator, admin |
| `weekly_reports` | `weekly_reports_select` | SELECT | The OJT, its active facilitator, admin |
| `correction_requests` | `correction_requests_select` | SELECT | The OJT, its active facilitator, admin |
| `attachments` | `attachments_select` | SELECT | The owner OJT, its active facilitator, admin |
| `report_events` | `report_events_select` | SELECT | Users who can read the report |
| `devices` | `devices_select_own`, `devices_insert_own`, `devices_update_own` | SELECT, INSERT, UPDATE | Own rows. INSERT: active OJT or facilitator only. |
| `notifications` | `notifications_select_own` | SELECT | Own rows |
| `audit_logs` | `audit_logs_select_admin` | SELECT | Admin |
| `processed_ops` | None | None | Only `sync_push` (S2) |

An inactive account (`profiles.status = 'inactive'`) gets no role. Thus it reads only its own profile row.

### 3.1 Storage bucket `attachments`

The bucket is private. File limit: 512000 bytes (500 KB, QR-PE-05). Content type: `image/jpeg` only. The file name must be `<owner_id>/<attachment_id>.jpg` (two UUIDs). `private.attachment_owner(name)` gives the owner from the name, or null for a different name.

| Policy | Action | Who |
|---|---|---|
| `attachments_insert_own` | INSERT | An active OJT, into its own folder only |
| `attachments_select` | SELECT | The owner OJT, its active facilitator, admin (`private.can_read_ojt`) |

There is no UPDATE or DELETE policy. Thus a file cannot be replaced or deleted (D-05). An upload of a file that exists gives an error (HTTP 400 or 409, "already exists"). The client counts that as uploaded.

## 4. Server rules (triggers)

| Trigger | Table | Rule |
|---|---|---|
| `touch` | All synced tables | Sets `version`, `created_at`, `updated_at`, `change_seq` (the pull cursor, D-11) |
| `check_roles` | `ojt_assignments` | `ojt_id` must be an OJT. `facilitator_id` must be a facilitator. One active assignment for each OJT (unique index). |
| `append_only` | `punches` | No DELETE. An UPDATE can change only `approved`, `doubtful_time`, and the common columns (D-05). |
| `read_only` | `audit_logs` | No UPDATE or DELETE (QR-SE-07) |
| `audit` | `profiles`, `ojt_assignments`, `companies`, `batches` (all changes); `weekly_reports` (status change); `correction_requests` (decision); `punches` (insert of a correction punch) | Writes one `audit_logs` row: actor, action, entity, before and after data (FR-AUD-01) |
| `on_auth_user_created` | `auth.users` | Makes the `profiles` row. The role comes from `app_metadata.role`. No role gives status `inactive`. |

## 5. RPC functions

| Function | Arguments | Returns | Who | Purpose |
|---|---|---|---|---|
| `heartbeat` | `source text`, `secret text` | `timestamptz` | `anon`, `authenticated` (needs the keep-alive secret) | Keep-alive write (runbook, section 3.1). `source`: 1 to 32 letters, digits, `_`, `-`. Wrong secret: error `28000`. |
| `heartbeat_status` | None | Table of `source`, `last_at` | `authenticated` (rows only for admin) | Newest heartbeat of each source |
| `server_epoch` | None | `uuid` | `authenticated` | Current server epoch (D-19) |
| `sync_push` | `p_ops jsonb`, `p_device_now timestamptz` (optional) | `jsonb` (see 5.1) | `authenticated`: active OJT and facilitator only | Offline sync design, section 4 |
| `sync_pull` | `p_cursor bigint` (default 0), `p_epoch uuid` (default null), `p_limit int` (1 to 500, default 500) | `jsonb` (see 5.2) | `authenticated`: active OJT and facilitator only | Offline sync design, section 5 |

### 5.1 `sync_push`

Request: `p_ops` is an array of 1 to 50 operations. Each operation is `{op_id, entity, entity_id, op_type, payload, base_version}`. `p_device_now` is the device clock at the send time (for the doubtful-time rule). A larger batch or a wrong type gives error `22023` for the whole call. An admin or inactive account gives error `42501`.

Response: `{server_time, results: [{op_id, result, cause, record}]}`, one result for each operation, in the request order. Each operation runs in its own subtransaction.

| Result | Meaning | `record` |
|---|---|---|
| `applied` | The server applied the change. | The server record (with `version`, `server_received_at`, `doubtful_time`) |
| `duplicate` | The `op_id` or the record ID is already applied (FR-SYNC-05, section 12). | The current server record |
| `conflict` | `base_version` is old (cause `version`), or a report exists for that week (cause `week_exists`). | The current server record |
| `rejected` | The operation is not valid. | None |

Cause codes of `rejected`: `file_missing` (attachment: no file in Storage at `storage_key`; the client must upload the file first), `invalid_data` (missing, wrong type, out of range, or not ISO 8601), `invalid_reference` (photo or other reference not found or not own), `forbidden` (wrong role or wrong owner, or a client correction punch), `id_conflict` (the ID belongs to a different user), `append_only` (punch or attachment update or delete), `not_found`, `not_editable` (report not in `draft` or `returned`), `unsupported` (entity or operation type).

Entities in S2:

| Entity | Operations | Rules |
|---|---|---|
| `punches` | `create` | OJT only. `ojt_id` must be the caller. Times: ISO 8601 with a time zone. The server sets `server_received_at`, `doubtful_time` (offline sync design, section 8), `approved`, `version`. |
| `weekly_reports` | `create`, `update` (content only) | OJT only. `week_start`: ISO date, a Monday. `update` needs `base_version`. Status changes come in S3. |
| `attachments` | `create` | OJT only. `owner_id` must be the caller. `storage_key` must be `<owner_id>/<id>.jpg`. The file must be in Storage. The server sets `size_bytes` from the Storage file. `report_id` is ignored in S2 (the report link comes in S3). An update gives `append_only`. Send the attachment operation before the punch or report that refers to it. |

### 5.2 `sync_pull`

Response: `{epoch, epoch_changed, server_time, records: [{entity, change_seq, data}], cursor, has_more}`. The function runs as the caller, so the RLS select policies give the scope. Records come in `change_seq` order. Soft-deleted records come as tombstones (`data.deleted_at` is set). Rows changed in the last 2 seconds wait for the next call, so that a transaction that is not committed yet cannot leave a gap. If `p_epoch` is not the current epoch, the response has `epoch_changed: true`, no records, and cursor 0 (section 12).

Entities in the pull: `profiles`, `companies`, `batches`, `ojt_assignments`, `punches`, `weekly_reports`, `report_events`, `correction_requests`, `attachments`, `notifications`.

NOTE: When an assignment ends, the records of that OJT leave the scope of the facilitator. The pull does not send tombstones for them. The client must remove them when the assignment record changes (S3).

## 6. Edge Functions

Planned: `admin-users` (S3), `export-csv` (S4), `push-notify` (S4). See `system/backend/AGENTS.md`.

## 7. Known advisor notes

| Note | Reason |
|---|---|
| `heartbeat`, `heartbeat_status`, `server_epoch`, `sync_push` are SECURITY DEFINER functions that signed-in users can call | On purpose. `heartbeat` checks the secret. `heartbeat_status` returns rows only for an admin. `server_epoch` returns one UUID. `sync_push` checks the role and the owner of each operation itself (TC-CI-ACL-01). |
| Leaked password protection is off | It needs a paid plan (D-16). Minimum password length 8 (QR-SE-04). |
| `heartbeat` can be called with the anon key | On purpose. The keep-alive sources have no user account. |
| Multiple permissive policies on `profiles`, `companies`, `batches`, `ojt_assignments` | Backend rule 3: one policy for one role and one action. The cost is small at this data size. |
| `processed_ops` has RLS and no policy | On purpose. Only `sync_push` uses it. |
