import Link from "next/link";
import { notFound } from "next/navigation";
import { getProperty } from "@/lib/compendium";
import { currentRoom } from "@/lib/room";
import { telHref } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { MyRequests } from "@/components/MyRequests";
import { RequestForm } from "@/components/RequestForm";

export const metadata = { title: "Report a problem" };

export default async function Report({ params }: { params: Promise<{ property: string }> }) {
  const property = await getProperty((await params).property);
  if (!property) notFound();
  const room = await currentRoom(property.id);

  return (
    <main className="px-4 pt-6">
      <Link href={`/${property.slug}/facilities`} className="inline-flex items-center gap-1 px-1 text-sm text-stone-500">
        <Icon name="left" className="h-4 w-4" /> Facilities
      </Link>
      <h1 className="mt-2 px-1 font-serif text-3xl">Report a problem</h1>
      <p className="mt-2 px-1 text-sm leading-relaxed text-stone-600">
        Something not working? Let us know and we&apos;ll sort it out.
        {property.receptionExt && <> For anything urgent, dial reception on {property.receptionExt}.</>}
      </p>
      <div className="card mt-5 px-4 py-4">
        {property.requestsEnabled ? (
          <RequestForm property={property.slug} kind="issue" room={room?.label} submitLabel="Send to reception" />
        ) : (
          <p className="text-sm text-stone-700">
            Please{" "}
            {property.receptionExt ? `dial reception on ${property.receptionExt}` : "contact reception"}
            {property.phone && (
              <>
                {" "}
                or{" "}
                <a href={telHref(property.phone)} className="font-medium text-brand underline">
                  call us
                </a>
              </>
            )}
            .
          </p>
        )}
      </div>
      <MyRequests propertyId={property.id} />
    </main>
  );
}
