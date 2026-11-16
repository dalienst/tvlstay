import { cookies } from "next/headers";
import { getRoomByCode } from "./compendium";

export const ROOM_COOKIE = "tvl_room";

/** The room the guest scanned in from, if it belongs to this property. */
export async function currentRoom(propertyId: number) {
  const code = (await cookies()).get(ROOM_COOKIE)?.value;
  if (!code) return null;
  const found = await getRoomByCode(code);
  return found && found.room.propertyId === propertyId ? found.room : null;
}
