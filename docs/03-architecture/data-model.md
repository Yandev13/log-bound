# Data model

This document gives the server data model (Supabase PostgreSQL). Supabase Auth keeps the email and the password hash in `auth.users`. The `profiles` table has the same ID. The local SQLite model on the mobile app is a subset of this model plus the sync tables (offline sync design, section 2).

## 1. Entity relationship diagram

```mermaid
erDiagram
    PROFILES ||--o| OJT_ASSIGNMENTS : "is assigned (OJT)"
    PROFILES ||--o{ OJT_ASSIGNMENTS : "facilitates"
    COMPANIES ||--o{ OJT_ASSIGNMENTS : hosts
    BATCHES ||--o{ OJT_ASSIGNMENTS : groups
    PROFILES ||--o{ PUNCHES : records
    PUNCHES ||--o| PUNCHES : "corrects"
    PROFILES ||--o{ CORRECTION_REQUESTS : requests
    CORRECTION_REQUESTS ||--o| PUNCHES : creates
    PROFILES ||--o{ WEEKLY_REPORTS : writes
    WEEKLY_REPORTS ||--o{ REPORT_EVENTS : has
    WEEKLY_REPORTS ||--o{ ATTACHMENTS : has
    PROFILES ||--o{ DEVICES : owns
    PROFILES ||--o{ NOTIFICATIONS : receives
    PROFILES ||--o{ AUDIT_LOGS : acts

    PROFILES {
        uuid id PK "same as auth.users.id"
        string role "ojt | facilitator | admin"
        string full_name
        string contact_no
        string status "active | inactive"
    }
    COMPANIES {
        uuid id PK
        string name
        string address
        bool photo_required
        bool location_required
    }
    BATCHES {
        uuid id PK
        string name
        date start_date
        date end_date
        int required_hours
    }
    OJT_ASSIGNMENTS {
        uuid id PK
        uuid ojt_id FK
        uuid facilitator_id FK
        uuid company_id FK
        uuid batch_id FK
        bool active
    }
    PUNCHES {
        uuid id PK
        uuid ojt_id FK
        string type "in | out"
        timestamp device_time
        string time_zone
        int clock_offset_s
        timestamp server_received_at
        float lat
        float lng
        float accuracy_m
        uuid photo_id FK
        string device_id
        uuid corrects_punch_id FK
        bool doubtful_time
        bool approved
    }
    CORRECTION_REQUESTS {
        uuid id PK
        uuid ojt_id FK
        uuid punch_id FK
        string kind "add | change"
        timestamp requested_time
        string reason
        string status "pending | approved | rejected"
        uuid decided_by FK
        string decided_device_id
        timestamp decided_at
        string remark
    }
    WEEKLY_REPORTS {
        uuid id PK
        uuid ojt_id FK
        date week_start
        text tasks_done
        text skills_learned
        text problems
        text next_plans
        string status "draft | submitted | approved | returned"
    }
    REPORT_EVENTS {
        uuid id PK
        uuid report_id FK
        uuid actor_id FK
        string action "submit | approve | return"
        string device_id
        string remark
    }
    ATTACHMENTS {
        uuid id PK
        uuid owner_id FK
        uuid report_id FK
        string storage_key
        int size_bytes
    }
    DEVICES {
        uuid id PK
        uuid user_id FK
        string platform
        string push_token
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string type
        string title
        bool read
    }
    AUDIT_LOGS {
        uuid id PK
        uuid actor_id FK
        string action
        string entity
        uuid entity_id
        json before_data
        json after_data
        timestamp created_at
    }
```

## 2. Common columns

Each table that the mobile app syncs has these columns. The diagram does not show them.

| Column | Type | Purpose |
|---|---|---|
| `version` | int | Increases at each change. Used for the version check. |
| `created_at` | timestamp (UTC) | Server time of creation |
| `updated_at` | timestamp (UTC) | Server time of the last change |
| `deleted_at` | timestamp (UTC), null | Soft delete. A deleted record is sent as a tombstone in the pull. |
| `change_seq` | bigint | Server change number. It is the pull cursor (D-11). |

## 3. Sync tables on the server

| Table | Purpose |
|---|---|
| `processed_ops` | `op_id`, `user_id`, `result`, `processed_at`. Stops a second application of the same operation (FR-SYNC-05). |
| `ops.server_meta` | The server epoch (D-19) |
| `ops.heartbeat` | Keep-alive calls: source and time (runbook, section 3) |
| `ops.settings` | Keep-alive secret and other settings. Not readable by app roles. |

## 4. Rules

1. Store all timestamps in UTC. Clients show Asia/Manila time (A-04).
2. A unique index on `weekly_reports (ojt_id, week_start)` allows one report for each OJT for each week.
3. A unique index on `ojt_assignments (ojt_id)` where `active = true` allows one active assignment for each OJT (A-01).
4. No RLS policy or function lets a user change or delete `audit_logs` or `punches` (QR-SE-07, D-05).
5. A work session is not a table. The server and the app calculate work sessions from the punches in time order.
6. A work session belongs to the date of its time-in. This rule also applies when a session continues after midnight.
7. Each decision record (`correction_requests` decision, `report_events`) stores the user ID, the device ID, and the server time (QR-SE-06). The server sets `decided_at` and `created_at`.
8. Each table in `public` has RLS turned on. The `ops` schema is not exposed through the Data API, except the `heartbeat` function.
