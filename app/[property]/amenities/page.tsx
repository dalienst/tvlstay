import { redirect } from "next/navigation";

// The Amenities page is now Facilities. Kept so old links and bookmarks still work.
export default async function Amenities({ params }: { params: Promise<{ property: string }> }) {
  redirect(`/${(await params).property}/facilities`);
}
