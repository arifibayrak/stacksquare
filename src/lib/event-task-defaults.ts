import type { EVENT_TASK_SECTIONS } from "@/db/schema";

// Default process checklist seeded into every new event so the standard
// process is never forgotten. Delete what does not apply per event.
export const DEFAULT_EVENT_TASKS: {
  section: (typeof EVENT_TASK_SECTIONS)[number];
  title: string;
}[] = [
  { section: "prep", title: "Book venue" },
  { section: "prep", title: "Confirm speaker" },
  { section: "prep", title: "Publish Luma page" },
  { section: "prep", title: "Announce event" },
  { section: "logistics", title: "Confirm headcount" },
  { section: "logistics", title: "Order catering" },
  { section: "logistics", title: "Test AV setup" },
  { section: "followup", title: "Send thank-you messages" },
  { section: "followup", title: "Post recap" },
  { section: "followup", title: "Log attendance" },
];
