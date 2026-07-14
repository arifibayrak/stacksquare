// Small dependency-free CSV reader (RFC 4180-ish): handles quoted fields,
// escaped quotes (""), commas and newlines inside quotes, and CRLF or LF. Good
// enough for a Luma guest export; not a general streaming parser.
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-blank lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type AttendeeStatus = "registered" | "attended" | "no_show";

export type ParsedAttendee = {
  name: string;
  email: string | null;
  phone: string | null;
  status: AttendeeStatus;
  answers: Record<string, string>;
};

function deriveStatus(approval: string, checkin: string): AttendeeStatus {
  const a = approval.toLowerCase();
  const c = checkin.toLowerCase();
  // Luma writes "Checked In" (or a timestamp) once someone arrives.
  const checkedIn =
    c.includes("checked in") ||
    c === "yes" ||
    c === "true" ||
    /\d{4}|:/.test(c);
  if (checkedIn) return "attended";
  if (["declined", "no show", "no-show", "cancelled", "canceled"].some((v) => a.includes(v)))
    return "no_show";
  return "registered";
}

// Turn raw CSV rows (first row = headers) into attendees. Core columns (name,
// email, phone, approval, check-in) are mapped by fuzzy header match; every
// other column is preserved verbatim in `answers` so registration questions are
// not lost.
export function mapLumaRows(rows: string[][]): {
  attendees: ParsedAttendee[];
  skipped: number;
} {
  if (rows.length < 2) return { attendees: [], skipped: 0 };
  const headers = rows[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());

  const idxOf = (...preds: Array<(h: string) => boolean>): number => {
    for (const p of preds) {
      const i = lower.findIndex(p);
      if (i >= 0) return i;
    }
    return -1;
  };

  const nameIdx = idxOf((h) => h === "name", (h) => h.includes("name"));
  const emailIdx = idxOf((h) => h === "email", (h) => h.includes("email"));
  const phoneIdx = idxOf((h) => h.includes("phone"));
  const approvalIdx = idxOf((h) => h.includes("approval"), (h) => h === "status");
  const checkinIdx = idxOf(
    (h) => h.includes("check"),
    (h) => h.includes("joined"),
  );

  const core = new Set(
    [nameIdx, emailIdx, phoneIdx, approvalIdx, checkinIdx].filter((i) => i >= 0),
  );

  const attendees: ParsedAttendee[] = [];
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");
    const email = get(emailIdx);
    const name = get(nameIdx) || email;
    if (!name && !email) {
      skipped++;
      continue;
    }
    const answers: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (core.has(c)) continue;
      const v = get(c);
      if (v) answers[headers[c] || `col_${c}`] = v;
    }
    attendees.push({
      name: name || email,
      email: email || null,
      phone: get(phoneIdx) || null,
      status: deriveStatus(get(approvalIdx), get(checkinIdx)),
      answers,
    });
  }
  return { attendees, skipped };
}
