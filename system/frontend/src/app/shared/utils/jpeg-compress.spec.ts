import { describe, expect, it } from 'vitest';
import { JpegEncoder, PHOTO_LIMIT_BYTES, PhotoTooLargeError, base64ToBytes, blobToBase64, compressJpeg } from './jpeg-compress';

/**
 * A fake encoder. The file size grows with the pixel count and the quality, like a real JPEG.
 * `bytesPerPixel` at quality 1 sets the size of the source photo. The result has only a size: a real Blob of
 * that size can be near 1 GB, and CI stops the test (DEF-010). `compressJpeg` reads only the size.
 */
function fakeEncoder(width: number, height: number, bytesPerPixel: number) {
  const calls: { side: number; quality: number }[] = [];
  const encoder: JpegEncoder = {
    maxSide: Math.max(width, height),
    encode: async (side, quality) => {
      calls.push({ side, quality });
      const scale = Math.min(1, side / Math.max(width, height));
      const size = Math.round(width * scale * height * scale * bytesPerPixel * quality);
      return { size, type: 'image/jpeg' } as Blob;
    },
  };
  return { encoder, calls };
}

describe('TC-CI-FILE-01 client photo compression (QR-PE-05)', () => {
  it('TC-CI-FILE-01: a 4 MB camera photo (4000 x 3000) becomes 500 KB or less', async () => {
    // 4000 x 3000 at about 0.33 byte for each pixel is a 4 MB JPEG.
    const { encoder, calls } = fakeEncoder(4000, 3000, 0.34);
    const blob = await compressJpeg(encoder);
    expect(blob.size).toBeLessThanOrEqual(PHOTO_LIMIT_BYTES);
    expect(calls[0]).toEqual({ side: 1280, quality: 0.8 });
  });

  it('TC-CI-FILE-01: a photo with much detail gets a lower quality, then a smaller size', async () => {
    const { encoder, calls } = fakeEncoder(4000, 3000, 2);
    const blob = await compressJpeg(encoder);
    expect(blob.size).toBeLessThanOrEqual(PHOTO_LIMIT_BYTES);
    expect(calls.map((c) => c.quality).slice(0, 4)).toEqual([0.8, 0.7, 0.6, 0.5]);
    expect(calls.at(-1)!.side).toBeLessThan(1280);
  });

  it('TC-CI-FILE-01: a small photo is not made larger', async () => {
    const { encoder, calls } = fakeEncoder(640, 480, 0.3);
    await compressJpeg(encoder);
    expect(calls).toEqual([{ side: 640, quality: 0.8 }]);
  });

  it('TC-CI-FILE-01: a photo that cannot be made small enough gives PhotoTooLargeError', async () => {
    const { encoder } = fakeEncoder(4000, 3000, 1000);
    await expect(compressJpeg(encoder)).rejects.toBeInstanceOf(PhotoTooLargeError);
  });

  it('TC-CI-FILE-01: base64 conversion keeps all bytes', async () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 7) % 256);
    const base64 = await blobToBase64(new Blob([bytes]));
    expect(base64ToBytes(base64)).toEqual(bytes);
  });
});
