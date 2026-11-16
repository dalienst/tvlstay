import { currentRoom } from "./room";
import { currentSpot } from "./spot";

/**
 * Requests are only taken from guests who scanned a QR code on site: the one in their apartment
 * (remembered for 30 days) or a spot code like the pool's (6 hours). Anyone with just the public
 * link can browse, but can't send requests. Switching a room or spot off, or giving it a new code,
 * stops the old scans working too.
 */
export async function guestAccess(propertyId: number) {
  const [room, spot] = await Promise.all([currentRoom(propertyId), currentSpot(propertyId)]);
  return { room, spot, canRequest: Boolean(room || spot) };
}

export const SCAN_TO_REQUEST = "To send a request, scan the QR code in your apartment or at the pool.";
