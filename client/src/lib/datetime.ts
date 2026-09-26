/**
 * Converting between UTC instants (what the API stores) and the value of an
 * <input type="datetime-local"> (the user's own wall-clock time, no zone).
 *
 * Both directions use the browser's local timezone. Using toISOString() to
 * fill the input shows UTC instead - an India user who scheduled 10:00 would
 * see 04:30, and saving the form again would move the schedule 5½ hours.
 */

/** UTC instant -> "YYYY-MM-DDTHH:mm" in the viewer's local time. */
export function toLocalInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" in the viewer's local time -> ISO UTC string (or undefined). */
export function fromLocalInputValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value); // no zone suffix => parsed as local time
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
