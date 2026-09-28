/**
 * A slide's full name, "Item — Part" ("Great Is Thy Faithfulness — Chorus"), or just the item
 * when it has no part of its own (a video, a single image) — never "Announcement Video —" with a
 * dangling dash.
 */
export function slideLabel(itemLabel: string, subLabel: string): string {
  return subLabel ? `${itemLabel} — ${subLabel}` : itemLabel
}

interface LabelledSlide {
  itemLabel: string
  subLabel: string
  verseRange?: string
  verseBook?: string
  passagePart?: string
}

/** A slide's part on its own, as the operator sees it: "Chorus", or a scripture page's own
 *  chapter and verses ("8:31–35") rather than the translation its audience footer shows. */
export function slidePartLabel(slide: LabelledSlide): string {
  return slide.verseRange ?? slide.subLabel
}

/**
 * The operator's name for a slide — the live label on the transport bar and the phone remote's
 * slide list. A scripture page is the whole passage with its own verses after it, "Psalm
 * 71:19-24 (19–20)" — the passage alone when it fits on one page — rather than the translation
 * its audience footer shows. The phone remote finds the live entry in its list by matching this
 * exact string (LiveSlideContent.slideLabel carries it there).
 */
export function operatorSlideLabel(slide: LabelledSlide): string {
  if (slide.verseRange) {
    return slide.passagePart ? `${slide.itemLabel} (${slide.passagePart})` : slide.itemLabel
  }
  return slideLabel(slide.itemLabel, slide.subLabel)
}

/** A scripture page's own reference, book and all — "John 3:16". */
export function pageReference(slide: LabelledSlide): string | undefined {
  return slide.verseRange && slide.verseBook ? `${slide.verseBook} ${slide.verseRange}` : undefined
}
