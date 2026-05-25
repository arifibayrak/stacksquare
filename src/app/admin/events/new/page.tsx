import { EventForm } from "@/components/admin/event-form";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <div className="mt-8 max-w-3xl">
        <EventForm />
      </div>
    </div>
  );
}
