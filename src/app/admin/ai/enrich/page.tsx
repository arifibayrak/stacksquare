import { EnrichClient } from "./client";

export default function EnrichPage() {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Enrich a contact</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Paste a LinkedIn bio (or any text) — Claude extracts structured fields,
        scores fit, and suggests interview angles.
      </p>

      <div className="mt-8 max-w-4xl">
        <EnrichClient />
      </div>
    </div>
  );
}
