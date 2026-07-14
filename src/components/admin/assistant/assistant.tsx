"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";

// Global admin assistant. A floating button plus Cmd/Ctrl+K opens a slide-over
// chat that streams over /api/assistant. Read tools run server-side; the
// create_task write tool streams an approval request the user confirms here
// before anything is written.
export function AssistantLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-white px-4 py-2.5 text-sm font-medium shadow-lg transition-colors hover:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
        aria-label="Open assistant"
      >
        Ask
        <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {"⌘"}K
        </kbd>
      </button>
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/assistant" }),
  );
  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    transport,
    // Once the user answers an approval card, auto-continue so the server runs
    // the approved tool and streams its result back.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--color-rule)] bg-[var(--color-paper)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-4 py-3 dark:border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Assistant
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Tasks, follow-ups, attendees. Writes need your ok.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Close assistant"
          >
            {"×"}
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div className="space-y-1 text-sm text-[var(--color-ink-muted)]">
              <p>Try:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>What is overdue for Kerem?</li>
                <li>Which attendees from the June fireside still need follow-up?</li>
                <li>Add a task to email Dana on Friday.</li>
              </ul>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={
                  "inline-block max-w-[90%] rounded-lg px-3 py-2 text-left text-sm " +
                  (m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-[var(--color-rule)] bg-white text-[var(--color-ink)] dark:border-zinc-800 dark:bg-zinc-900")
                }
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    );
                  }
                  if (isToolUIPart(part)) {
                    const name = getToolName(part);
                    if (part.state === "approval-requested") {
                      const approvalId = part.approval.id;
                      return (
                        <ApprovalCard
                          key={i}
                          name={name}
                          input={part.input}
                          onRespond={(approved) =>
                            addToolApprovalResponse({ id: approvalId, approved })
                          }
                        />
                      );
                    }
                    if (part.state === "output-available")
                      return <ToolChip key={i} name={name} ok />;
                    if (part.state === "output-denied")
                      return <ToolChip key={i} name={name} label="skipped" />;
                    if (part.state === "output-error")
                      return <ToolChip key={i} name={name} label="failed" />;
                    return <ToolChip key={i} name={name} label="working" />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {busy && (
            <p className="text-xs text-[var(--color-ink-muted)]">Thinking...</p>
          )}
        </div>

        <div className="border-t border-[var(--color-rule)] p-3 dark:border-zinc-800">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask or tell the assistant..."
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !input.trim()}
              className="rounded-md bg-[var(--color-ink)] px-3 py-2 text-sm font-medium text-[var(--color-paper)] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function prettyTool(name: string): string {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ToolChip({
  name,
  ok,
  label,
}: {
  name: string;
  ok?: boolean;
  label?: string;
}) {
  return (
    <span className="mr-1 mt-1 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {ok ? "✓" : "•"} {prettyTool(name)}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

function ApprovalCard({
  name,
  input,
  onRespond,
}: {
  name: string;
  input: unknown;
  onRespond: (approved: boolean) => void;
}) {
  const [done, setDone] = useState(false);
  const data = (input ?? {}) as Record<string, unknown>;
  const fields = Object.entries(data).filter(
    ([, v]) => v != null && v !== "",
  );

  return (
    <div className="mt-1 rounded-md border border-brand-500/40 bg-brand-50 p-2 text-[13px] dark:bg-zinc-800/60">
      <p className="font-medium text-[var(--color-ink)]">
        Confirm: {prettyTool(name)}
      </p>
      <ul className="mt-1 space-y-0.5 text-[var(--color-ink-soft)]">
        {fields.map(([k, v]) => (
          <li key={k}>
            <span className="text-[var(--color-ink-muted)]">{k}:</span>{" "}
            {String(v)}
          </li>
        ))}
      </ul>
      {done ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Responded.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDone(true);
              onRespond(true);
            }}
            className="rounded bg-[var(--color-ink)] px-2.5 py-1 text-xs font-medium text-[var(--color-paper)]"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(true);
              onRespond(false);
            }}
            className="rounded border border-zinc-300 px-2.5 py-1 text-xs dark:border-zinc-600"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
