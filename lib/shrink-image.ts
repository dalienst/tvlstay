// Runs in the browser. Phone photos are often 4 to 10 MB, more than a server request
// on the host accepts (Vercel allowed about 4.5 MB; kept as a safe size). Big photos are scaled down to 2400px JPEG before
// uploading; the server then makes its own 2000px WebP copy.
const LIMIT = 2.5 * 1024 * 1024;
const MAX_SIDE = 2400;

export async function shrinkForUpload(file: File): Promise<File> {
  if (file.size <= LIMIT || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. a format this browser can't decode; let the server try
  }
}
