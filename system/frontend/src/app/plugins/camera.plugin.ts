// Layer 1: wrapper of @capacitor/camera (frontend rule 5; FR-DTR-05).
// It gives the selfie as a JPEG of 500 KB or less (QR-PE-05). The camera does not need the network.
import { InjectionToken } from '@angular/core';
import { Camera, CameraDirection, CameraErrorCode } from '@capacitor/camera';
import { canvasEncoder, compressJpeg } from '../shared/utils/jpeg-compress';

/** `cancelled`: the user closed the camera. `denied`: no camera permission. `failed`: no camera or other error. */
export type SelfieResult = { ok: true; jpeg: Blob } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

export interface CameraPort {
  takeSelfie(): Promise<SelfieResult>;
}

function failureOf(error: unknown): 'cancelled' | 'denied' | 'failed' {
  const code = (error as { code?: string } | null)?.code;
  if (code === CameraErrorCode.TakePhotoCancelled) {
    return 'cancelled';
  }
  if (code === CameraErrorCode.CameraPermissionDenied) {
    return 'denied';
  }
  return 'failed';
}

async function takeSelfie(): Promise<SelfieResult> {
  try {
    // Android does not support `cameraDirection`. The user selects the front camera in the camera screen.
    const photo = await Camera.takePhoto({ quality: 90, cameraDirection: CameraDirection.Front, saveToGallery: false, editable: 'no' });
    if (!photo.webPath) {
      return { ok: false, reason: 'failed' };
    }
    const source = await (await fetch(photo.webPath)).blob();
    return { ok: true, jpeg: await compressJpeg(await canvasEncoder(source)) };
  } catch (error) {
    return { ok: false, reason: failureOf(error) };
  }
}

export const CAMERA = new InjectionToken<CameraPort>('CAMERA', {
  providedIn: 'root',
  factory: () => ({ takeSelfie }),
});
