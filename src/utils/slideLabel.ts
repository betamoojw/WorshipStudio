/**
 * A slide's full name, "Item — Part" ("Great Is Thy Faithfulness — Chorus"), or just the item
 * when it has no part of its own (a video, a single image) — never "Announcement Video —" with a
 * dangling dash. Shared with the phone remote (src-remote/App.vue), which finds the live entry in
 * its slide list by matching this exact string.
 */
export function slideLabel(itemLabel: string, subLabel: string): string {
  return subLabel ? `${itemLabel} — ${subLabel}` : itemLabel
}
