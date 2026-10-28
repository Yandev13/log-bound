// Attachment repository: the photo files of the user (FR-DTR-05; offline sync design, section 10).
// The file goes to the app data folder first. The record and its outbox operation go in the same transaction
// as the punch or report that refers to the photo. The sync engine uploads the file before the push.
import { Injectable, inject } from '@angular/core';
import { FILES } from '../../plugins/files.plugin';
import { blobToBase64 } from '../../shared/utils/jpeg-compress';
import { newId } from '../../shared/utils/uuid';
import { LocalDb } from '../local-db/local-db';
import { enqueue } from '../sync/outbox';
import { createPayload } from '../sync/payloads';

/** A photo file on the device that has no record yet. */
export interface LocalPhoto {
  id: string;
  ownerId: string;
  localPath: string;
}

/** The local folder of the photos of one user. Logout removes it. */
export const photoFolder = (ownerId: string) => `photos/${ownerId}`;

/** The Storage name. It is fixed, so an offline payload can contain it (API contract, section 3.1). */
export const storageKeyOf = (ownerId: string, id: string) => `${ownerId}/${id}.jpg`;

/** Adds the attachment record (sync status `pending`, upload status `local`) and its `create` operation. */
export async function insertPhoto(tx: LocalDb, photo: LocalPhoto, userId: string): Promise<void> {
  const row = {
    id: photo.id,
    owner_id: photo.ownerId,
    report_id: null,
    storage_key: storageKeyOf(photo.ownerId, photo.id),
  };
  await tx.run(
    `insert into attachments (id, owner_id, report_id, storage_key, local_path, upload_status, version, sync_status)
     values (?, ?, null, ?, ?, 'local', 0, 'pending')`,
    [row.id, row.owner_id, row.storage_key, photo.localPath],
  );
  await enqueue(tx, { userId, entity: 'attachments', entityId: photo.id, opType: 'create', payload: createPayload('attachments', row) });
}

@Injectable({ providedIn: 'root' })
export class AttachmentRepository {
  private readonly files = inject(FILES);

  /** Writes the JPEG to the app data folder. The record comes with `insertPhoto` in the transaction of the punch. */
  async storePhoto(ownerId: string, jpeg: Blob): Promise<LocalPhoto> {
    const id = newId();
    const localPath = `${photoFolder(ownerId)}/${id}.jpg`;
    await this.files.write(localPath, await blobToBase64(jpeg));
    return { id, ownerId, localPath };
  }

  /** Removes the photo files of the user (logout, QR-SF-01). */
  removeFilesOf(ownerId: string): Promise<void> {
    return this.files.removeFolder(photoFolder(ownerId));
  }
}
