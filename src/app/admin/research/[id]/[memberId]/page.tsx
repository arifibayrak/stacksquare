import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, segments, segmentMembers, prospects } from "@/db";
import { ProspectDetailClient, type ProspectDetail } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;

  const [m] = await db
    .select()
    .from(segmentMembers)
    .where(eq(segmentMembers.id, memberId));
  if (!m || m.segmentId !== id) notFound();

  const [p] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, m.prospectId));
  if (!p) notFound();

  const [seg] = await db.select().from(segments).where(eq(segments.id, id));
  if (!seg) notFound();

  const detail: ProspectDetail = {
    memberId: m.id,
    segmentId: seg.id,
    segmentSlug: seg.slug,
    prospectId: p.id,
    name: p.name,
    title: p.title,
    company: p.company,
    city: p.city,
    linkedinUrl: p.linkedinUrl,
    email: p.email,
    emailConfidence: p.emailConfidence,
    roles: p.roles,
    bio: p.bio,
    notes: p.notes,
    discoveredVia: p.discoveredVia,
    sourceUrl: p.sourceUrl,
    originSignal: p.originSignal,
    locationSignal: p.locationSignal,
    enrichedAt: p.enrichedAt ? p.enrichedAt.toISOString() : null,
    contactId: p.contactId,
  };

  return (
    <div className="px-8 py-10">
      <Link
        href={`/admin/research/${seg.id}`}
        className="text-sm text-[var(--color-ink-muted)] hover:text-brand-600"
      >
        ← {seg.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        {p.name}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        {[p.title, p.company].filter(Boolean).join(" · ") || "Prospect"}
      </p>
      <ProspectDetailClient p={detail} />
    </div>
  );
}
