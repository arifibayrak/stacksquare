import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  and,
  asc,
  eq,
  ilike,
  isNotNull,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  db,
  tasks,
  contacts,
  events,
  eventAttendees,
  STAGE_LABELS,
} from "@/db";
import { env } from "@/lib/env";
import { currentOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OWNER = ["arif", "kerem", "both"] as const;
const today = () => new Date().toISOString().slice(0, 10);

const SYSTEM = [
  "You are the StackSquare admin assistant for the two founders, Arif and Kerem.",
  "StackSquare runs fireside rooms and expert sessions; Luma handles registration.",
  "Use the read tools to answer questions about tasks, follow-ups, the pipeline, and event attendees. Prefer calling a tool over guessing.",
  "To create a task, call create_task directly with the details. Do not ask the user to confirm in text first; the tool has its own approval step the user must accept before anything is written.",
  "Be concise and concrete. No em dashes in your replies; use commas, periods, or the middle dot. Dates are YYYY-MM-DD.",
].join(" ");

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic(env.modelFast()),
    system: `${SYSTEM} Today is ${today()} (UTC); resolve relative dates such as "Friday" against today.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools: {
      list_tasks: tool({
        description:
          "List open tasks on the shared work queue. Optionally filter to one owner (arif/kerem/both) or only overdue ones.",
        inputSchema: z.object({
          owner: z.enum(OWNER).optional(),
          onlyOverdue: z.boolean().optional(),
        }),
        execute: async ({ owner, onlyOverdue }) => {
          const conds: SQL[] = [eq(tasks.status, "open")];
          if (owner) conds.push(eq(tasks.owner, owner));
          if (onlyOverdue) {
            conds.push(isNotNull(tasks.dueDate));
            conds.push(lte(tasks.dueDate, today()));
          }
          const rows = await db
            .select({
              title: tasks.title,
              owner: tasks.owner,
              due: tasks.dueDate,
              priority: tasks.priority,
            })
            .from(tasks)
            .where(and(...conds))
            .orderBy(asc(tasks.dueDate))
            .limit(50);
          return { count: rows.length, tasks: rows };
        },
      }),
      list_followups_due: tool({
        description:
          "List contacts whose next action is due today or overdue (active pipeline stages only).",
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await db
            .select({
              name: contacts.name,
              nextAction: contacts.nextAction,
              due: contacts.nextActionDue,
              owner: contacts.owner,
            })
            .from(contacts)
            .where(
              and(
                eq(contacts.parked, false),
                isNotNull(contacts.nextActionDue),
                lte(contacts.nextActionDue, today()),
                ne(contacts.stage, "long_term"),
                ne(contacts.stage, "dormant"),
              ),
            )
            .orderBy(asc(contacts.nextActionDue))
            .limit(50);
          return { count: rows.length, contacts: rows };
        },
      }),
      pipeline_summary: tool({
        description: "Count of active (non-parked) contacts in each pipeline stage.",
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await db
            .select({
              stage: contacts.stage,
              count: sql<number>`count(*)::int`,
            })
            .from(contacts)
            .where(eq(contacts.parked, false))
            .groupBy(contacts.stage);
          return Object.fromEntries(
            rows.map((r) => [STAGE_LABELS[r.stage], r.count]),
          );
        },
      }),
      list_attendees_to_follow_up: tool({
        description:
          "List event attendees still needing follow-up (follow-up status 'to contact'), found by a fuzzy event title.",
        inputSchema: z.object({
          eventTitle: z.string().describe("Part of the event title"),
        }),
        execute: async ({ eventTitle }) => {
          const [ev] = await db
            .select({ id: events.id, title: events.title })
            .from(events)
            .where(ilike(events.title, `%${eventTitle}%`))
            .limit(1);
          if (!ev) return { error: "No event matches that title." };
          const rows = await db
            .select({
              name: eventAttendees.name,
              email: eventAttendees.email,
              status: eventAttendees.status,
            })
            .from(eventAttendees)
            .where(
              and(
                eq(eventAttendees.eventId, ev.id),
                eq(eventAttendees.followUp, "to_contact"),
              ),
            )
            .limit(100);
          return { event: ev.title, count: rows.length, attendees: rows };
        },
      }),
      create_task: tool({
        description:
          "Create a task on the shared work queue. The user must approve before it is written.",
        inputSchema: z.object({
          title: z.string().describe("What needs doing"),
          owner: z
            .enum(OWNER)
            .optional()
            .describe("Who owns it; defaults to the current user"),
          dueDate: z.string().optional().describe("Due date as YYYY-MM-DD"),
          priority: z.enum(["p1", "p2", "p3"]).optional(),
        }),
        needsApproval: true,
        execute: async ({ title, owner, dueDate, priority }) => {
          const me = await currentOwner();
          if (!me) return { error: "Could not resolve the current founder." };
          await db.insert(tasks).values({
            title,
            owner: owner ?? me,
            createdBy: me,
            dueDate: dueDate ?? null,
            priority: priority ?? "p2",
          });
          revalidatePath("/admin/tasks");
          revalidatePath("/admin");
          return {
            created: true,
            title,
            owner: owner ?? me,
            dueDate: dueDate ?? null,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
