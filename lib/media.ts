import sharp from "sharp";
import { getDb } from "@/lib/db/db";
import { media } from "@/lib/db/schema";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 2000;

/** Resizes to at most 2000px on the long side, converts to WebP and stores it. Returns the public URL. */
export async function saveUpload(file: File, opts: { propertyId: number | null; userId: string }) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  const input = Buffer.from(await file.arrayBuffer());
  let data: Buffer;
  let info: { width: number; height: number };
  try {
    const out = await sharp(input)
      .rotate() // respect phone camera orientation
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    data = out.data;
    info = out.info;
  } catch {
    throw new Error(`${file.name} couldn't be read as an image.`);
  }
  const [row] = await getDb()
    .insert(media)
    .values({
      propertyId: opts.propertyId,
      filename: file.name.slice(0, 200),
      contentType: "image/webp",
      width: info.width,
      height: info.height,
      size: data.length,
      data,
      uploadedBy: opts.userId,
    })
    .returning({ id: media.id });
  return { id: row.id, url: `/media/${row.id}` };
}
