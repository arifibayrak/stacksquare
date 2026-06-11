"use client";

import { useTransition } from "react";
import type { Contact } from "@/db/schema";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { STAGES, STAGE_LABELS } from "@/db/schema";

const SENIORITY: Array<[string, string]> = [
  ["", "·"],
  ["peer", "Peer"],
  ["mid", "Mid"],
  ["senior", "Senior"],
  ["c_suite", "C-suite"],
];

const RELATIONSHIP: Array<[string, string]> = [
  ["", "·"],
  ["warm_1st", "Warm, 1st degree"],
  ["warm_2nd", "Warm, 2nd degree"],
  ["cold", "Cold"],
];

const CIRCLE: Array<[string, string]> = [
  ["inner", "Inner circle (people we know)"],
  ["reach", "Within reach (targeted)"],
  ["moonshot", "Moonshot (globally amazing)"],
];

const PRIORITY: Array<[string, string]> = [
  ["p1", "P1"],
  ["p2", "P2"],
  ["p3", "P3"],
];

const OWNER: Array<[string, string]> = [
  ["", "·"],
  ["arif", "Arif"],
  ["kerem", "Kerem"],
  ["both", "Both"],
];

export function ContactForm({ contact }: { contact?: Contact }) {
  const [pending, startTransition] = useTransition();
  const editing = !!contact;

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      if (editing) {
        await updateContact(contact!.id, formData);
      } else {
        await createContact(formData);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required defaultValue={contact?.name} />
        <Field
          label="Role"
          name="role"
          defaultValue={contact?.role ?? ""}
          placeholder="Partner / Founder / VP Strategy"
        />
        <Field
          label="Company"
          name="company"
          defaultValue={contact?.company ?? ""}
        />
        <Field
          label="City"
          name="city"
          defaultValue={contact?.city ?? ""}
          placeholder="London"
        />
        <Field
          label="LinkedIn URL"
          name="linkedinUrl"
          type="url"
          defaultValue={contact?.linkedinUrl ?? ""}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
        />
        <Field
          label="Phone"
          name="phone"
          defaultValue={contact?.phone ?? ""}
        />
        <Select
          label="Seniority"
          name="seniority"
          options={SENIORITY}
          defaultValue={contact?.seniority ?? ""}
        />
        <Select
          label="Relationship"
          name="relationship"
          options={RELATIONSHIP}
          defaultValue={contact?.relationship ?? ""}
        />
        <Select
          label="Circle"
          name="circle"
          options={CIRCLE}
          defaultValue={contact?.circle ?? "reach"}
        />
        <Field
          label="Source"
          name="source"
          defaultValue={contact?.source ?? ""}
          placeholder="Imperial alumni, LinkedIn outbound, etc."
        />
        <Field
          label="Expertise (comma separated)"
          name="expertise"
          defaultValue={(contact?.expertise ?? []).join(", ")}
          placeholder="vc, fintech, b2b-saas"
        />
        <Select
          label="Stage"
          name="stage"
          options={STAGES.map((s) => [s, STAGE_LABELS[s]] as [string, string])}
          defaultValue={contact?.stage ?? "identified"}
        />
        <Field
          label="Fit score (1-10)"
          name="fitScore"
          type="number"
          defaultValue={contact?.fitScore?.toString() ?? ""}
        />
        <Select
          label="Priority"
          name="priority"
          options={PRIORITY}
          defaultValue={contact?.priority ?? "p2"}
        />
        <Select
          label="Owner"
          name="owner"
          options={OWNER}
          defaultValue={contact?.owner ?? ""}
        />
        <Field
          label="Next action"
          name="nextAction"
          defaultValue={contact?.nextAction ?? ""}
          placeholder="Send Calendly link"
        />
        <Field
          label="Next action due"
          name="nextActionDue"
          type="date"
          defaultValue={
            contact?.nextActionDue
              ? String(contact.nextActionDue).slice(0, 10)
              : ""
          }
        />
      </div>

      <Textarea
        label="Notes"
        name="notes"
        defaultValue={contact?.notes ?? ""}
        rows={6}
        placeholder="Why they're a fit, talking points, internal context."
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create contact"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  defaultValue?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue = "",
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}
