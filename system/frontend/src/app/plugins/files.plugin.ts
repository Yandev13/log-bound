// Layer 1: wrapper of @capacitor/filesystem (frontend rule 5; offline sync design, section 10, step 2).
// The files are in the app data folder. Other apps cannot read it, and Android removes it with the app.
import { InjectionToken } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

export interface FilesPort {
  /** Writes base64 data to `path` (relative to the app data folder). It makes the folders if necessary. */
  write(path: string, base64: string): Promise<void>;
  /** The base64 data of the file, or null if the file does not exist. */
  read(path: string): Promise<string | null>;
  /** Removes a folder and its contents. No error if the folder does not exist. */
  removeFolder(path: string): Promise<void>;
}

export const FILES = new InjectionToken<FilesPort>('FILES', {
  providedIn: 'root',
  factory: () => ({
    async write(path, base64) {
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true });
    },
    async read(path) {
      try {
        const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
        return typeof data === 'string' ? data : null;
      } catch {
        return null;
      }
    },
    async removeFolder(path) {
      try {
        await Filesystem.rmdir({ path, directory: Directory.Data, recursive: true });
      } catch {
        // The folder does not exist.
      }
    },
  }),
});
