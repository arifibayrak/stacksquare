import { db, contacts } from "@/db";
import { asc, ne } from "drizzle-orm";
import { DraftClient } from "./client";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const list = await db
    .select({ id: contacts.id, name: contacts.name, stage: contacts.stage })
    .from(contacts)
    .where(ne(contacts.stage, "dormant"))
    .orderBy(asc(contacts.name));

  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Draft outreach</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pick a contact and channel. Claude drafts the message in your voice.
      </p>
      <div className="mt-8 max-w-3xl">
        <DraftClient contacts={list} />
      </div>
    </div>
  );
}
