// Contacts, messages, and conversations all store the same WhatsApp number,
// but it arrives from different places in different shapes: CSV imports carry
// whatever a user typed ("+91 87663-50093", "0" + area code, bare 10-digit
// local numbers), while Meta's webhook payload sends the wa_id digits-only
// with a country code. Comparing those raw strings for equality (contact
// deletion cascades, conversation lookup, campaign de-dup) silently fails
// whenever the shapes don't match. Canonical form here is "last 10 digits,
// no symbols" - it matches the bare-local-number shape that's already the
// overwhelming majority of stored data, so normalizing existing rows to it
// touches the fewest records.
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
