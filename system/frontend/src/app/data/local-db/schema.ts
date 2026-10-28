// Local schema and migrations (offline sync design, section 2). The local tables are a subset of the
// server tables plus the sync tables. Add a new migration at the end. Do not change a published migration.

export interface LocalMigration {
  version: number;
  description: string;
  sql: string;
}

/** Common columns of each synced table (offline sync design, section 2). */
const SYNC_COLUMNS = `
  version integer not null default 0,
  updated_at text,
  deleted_at text,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'issue'))`;

export const LOCAL_MIGRATIONS: readonly LocalMigration[] = [
  {
    version: 1,
    description: 'Core local tables, outbox, sync state, sync log',
    sql: `
      create table user_profile (
        id text primary key,
        role text not null check (role in ('ojt', 'facilitator', 'admin')),
        full_name text not null,
        status text not null,
        contact_no text,
        assignment_json text,
        ${SYNC_COLUMNS}
      );

      create table punches (
        id text primary key,
        ojt_id text not null,
        type text not null check (type in ('in', 'out')),
        device_time text not null,
        time_zone text not null,
        clock_offset_s integer,
        server_received_at text,
        lat real,
        lng real,
        accuracy_m real,
        photo_id text,
        device_id text not null,
        corrects_punch_id text,
        doubtful_time integer not null default 0,
        approved integer not null default 0,
        ${SYNC_COLUMNS}
      );
      create index punches_ojt_time on punches (ojt_id, device_time);

      create table weekly_reports (
        id text primary key,
        ojt_id text not null,
        week_start text not null,
        tasks_done text not null default '',
        skills_learned text not null default '',
        problems text not null default '',
        next_plans text not null default '',
        status text not null default 'draft',
        ${SYNC_COLUMNS},
        unique (ojt_id, week_start)
      );

      create table report_events (
        id text primary key,
        report_id text not null,
        actor_id text not null,
        action text not null,
        device_id text,
        remark text,
        created_at text,
        ${SYNC_COLUMNS}
      );
      create index report_events_report on report_events (report_id);

      create table correction_requests (
        id text primary key,
        ojt_id text not null,
        punch_id text,
        kind text not null,
        requested_time text not null,
        reason text not null,
        status text not null default 'pending',
        decided_by text,
        decided_device_id text,
        decided_at text,
        remark text,
        ${SYNC_COLUMNS}
      );

      create table notifications (
        id text primary key,
        user_id text not null,
        type text not null,
        title text not null,
        read integer not null default 0,
        created_at text,
        ${SYNC_COLUMNS}
      );

      create table attachments (
        id text primary key,
        owner_id text not null,
        report_id text,
        storage_key text,
        size_bytes integer,
        local_path text,
        upload_status text not null default 'local' check (upload_status in ('local', 'uploaded')),
        ${SYNC_COLUMNS}
      );

      create table outbox (
        op_id text primary key,
        user_id text not null,
        entity text not null,
        entity_id text not null,
        op_type text not null check (op_type in ('create', 'update', 'delete')),
        payload text not null,
        base_version integer,
        created_at text not null,
        attempts integer not null default 0,
        last_error text,
        status text not null default 'queued' check (status in ('queued', 'sending', 'issue'))
      );
      create index outbox_queue on outbox (user_id, status, created_at);

      create table sync_state (
        key text primary key,
        value text
      );

      create table sync_log (
        id integer primary key autoincrement,
        at text not null,
        kind text not null,
        detail text
      );
    `,
  },
  {
    version: 2,
    description: 'Pulled reference data: profiles, assignments, companies, batches (S2)',
    sql: `
      create table profiles (
        id text primary key,
        role text not null,
        full_name text not null default '',
        contact_no text,
        status text not null,
        created_at text,
        ${SYNC_COLUMNS}
      );

      create table ojt_assignments (
        id text primary key,
        ojt_id text not null,
        facilitator_id text not null,
        company_id text not null,
        batch_id text not null,
        active integer not null default 1,
        created_at text,
        ${SYNC_COLUMNS}
      );
      create index ojt_assignments_facilitator on ojt_assignments (facilitator_id);

      create table companies (
        id text primary key,
        name text not null,
        address text not null default '',
        photo_required integer not null default 0,
        location_required integer not null default 0,
        created_at text,
        ${SYNC_COLUMNS}
      );

      create table batches (
        id text primary key,
        name text not null,
        start_date text not null,
        end_date text not null,
        required_hours integer not null,
        created_at text,
        ${SYNC_COLUMNS}
      );
    `,
  },
  {
    version: 3,
    description: 'Server copy of a record with a sync issue, for the "Sync issues" screen (FR-SYNC-06)',
    sql: `alter table outbox add column server_record text;`,
  },
];

/** The newest local schema version. */
export const LOCAL_SCHEMA_VERSION = LOCAL_MIGRATIONS[LOCAL_MIGRATIONS.length - 1].version;
