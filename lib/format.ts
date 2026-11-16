/** "+254725959552" for tel: links. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(number: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

/** Pasted https links skip Next's image optimiser (it only optimises our own files and uploads). */
export function isExternal(src: string) {
  return !src.startsWith("/");
}
