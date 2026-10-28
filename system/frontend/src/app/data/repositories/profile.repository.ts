// Profile repository: the only path to profile data (frontend rule 3).
// It reads the server. On mobile it also keeps a local copy, so that the app opens offline (FR-AUTH-04).
import { Injectable, inject } from '@angular/core';
import { Role, isRole } from '../../core/auth/access';
import { SUPABASE } from '../../core/supabase.client';
import { LocalDbService } from '../local-db/local-db.service';

export interface Profile {
  id: string;
  role: Role;
  fullName: string;
  status: 'active' | 'inactive';
}

interface ProfileRow {
  [key: string]: string | number | null;
  id: string;
  role: string;
  full_name: string;
  status: string;
}

function fromRow(row: ProfileRow): Profile | null {
  if (!isRole(row.role)) {
    return null;
  }
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    status: row.status === 'active' ? 'active' : 'inactive',
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileRepository {
  private readonly supabase = inject(SUPABASE);
  private readonly local = inject(LocalDbService);

  /** Keeps a local copy of the profile (mobile only). The web app does nothing here. */
  async cacheLocal(profile: Profile): Promise<void> {
    if (!this.local.available) {
      return;
    }
    const db = await this.local.db();
    await db.run(
      `insert into user_profile (id, role, full_name, status, sync_status) values (?, ?, ?, ?, 'synced')
       on conflict (id) do update set role = excluded.role, full_name = excluded.full_name, status = excluded.status`,
      [profile.id, profile.role, profile.fullName, profile.status],
    );
  }

  /** The local copy of the profile, or null (mobile only). */
  async getLocal(id: string): Promise<Profile | null> {
    if (!this.local.available) {
      return null;
    }
    const db = await this.local.db();
    const rows = await db.query<ProfileRow>(
      'select id, role, full_name, status from user_profile where id = ? and deleted_at is null',
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  /** Gives the profile, or null if RLS does not show it. Throws on a network or server error. */
  async fetchById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, role, full_name, status')
      .eq('id', id)
      .maybeSingle<ProfileRow>();
    if (error) {
      throw error;
    }
    return data ? fromRow(data) : null;
  }
}
