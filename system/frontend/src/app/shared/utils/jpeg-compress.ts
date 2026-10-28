// Layer 0: photo compression to 500 KB or less (QR-PE-05; offline sync design, section 10, step 1).
// `compressJpeg` has only the search logic. The encoder is a parameter, so that unit tests can give a fake.
// `canvasEncoder` is the real encoder of the app (browser canvas).

/** QR-PE-05: 500 KB. The Storage bucket has the same limit (API contract, section 3.1). */
export const PHOTO_LIMIT_BYTES = 500 * 1024;
/** The longest side of a photo before compression. A selfie for a DTR punch does not need more. */
export const PHOTO_MAX_SIDE = 1280;
const MIN_SIDE = 320;
const QUALITIES = [0.8, 0.7, 0.6, 0.5] as const;
const SIDE_STEP = 0.75;

export interface JpegEncoder {
  /** The longest side of the source image, in pixels. */
  readonly maxSide: number;
  /** Encodes the image as JPEG. The longest side becomes `side` pixels or less. `quality` is 0 to 1. */
  encode(side: number, quality: number): Promise<Blob>;
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super(`The photo cannot be made ${PHOTO_LIMIT_BYTES} bytes or less.`);
    this.name = 'PhotoTooLargeError';
  }
}

/**
 * Tries the qualities from high to low. If no quality gives a file within the limit, it makes the image smaller
 * and tries again. It gives the first result within the limit.
 */
export async function compressJpeg(encoder: JpegEncoder, limit = PHOTO_LIMIT_BYTES): Promise<Blob> {
  let side = Math.min(PHOTO_MAX_SIDE, encoder.maxSide);
  for (;;) {
    for (const quality of QUALITIES) {
      const blob = await encoder.encode(side, quality);
      if (blob.size <= limit) {
        return blob;
      }
    }
    if (side <= MIN_SIDE) {
      throw new PhotoTooLargeError();
    }
    side = Math.max(MIN_SIDE, Math.floor(side * SIDE_STEP));
  }
}

/** The encoder of the app. It uses a canvas, so it does not operate in the unit tests (jsdom has no canvas). */
export async function canvasEncoder(source: Blob): Promise<JpegEncoder> {
  const image = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  return {
    maxSide: Math.max(image.width, image.height),
    encode: (side, quality) => {
      const scale = Math.min(1, side / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        return Promise.reject(new Error('No canvas context'));
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('JPEG encode failed'))), 'image/jpeg', quality),
      );
    },
  };
}

/** Base64 text of the bytes, without the `data:` prefix (Filesystem plugin format). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
