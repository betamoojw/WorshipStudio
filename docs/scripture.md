# Scripture

Scripture is a service item like any other — add it to the order of worship, type a reference, and
Worship Studio looks up the text and builds the slides. It also appears inside a
[sermon](/services) item, which can carry a list of passages of its own.

## Translations

**KJV is bundled** and always works — no key, no account, no internet. Two others can be added
under [Settings → Bible Translations](/settings):

- **ESV**, with a free API key from Crossway.
- **api.bible editions** (NIV and many others), with an api.bible key.

Whichever you set as the default is pre-filled on every new scripture item, and any item can
override it. The key is stored in your library, so it's shared with every device that syncs —
you only enter it once.

## Two ways to show a passage

Each scripture item — and each sermon passage — is either **Full Text** or **Reference Only**.
The toggle sits with the item's other settings in the workspace.

### Full Text

The verses appear on screen, with verse numbers as small chips so they stay readable at any size.

![A full-text scripture slide — Romans 8:28-39 in the KJV, with verse number chips and the translation in the footer](/screenshots/scripture-full.webp)

**Long passages split themselves across slides.** The split always lands on a verse boundary,
never mid-verse, and the resulting pages are what Previous/Next steps through. You don't
paginate anything by hand.

The congregation sees the whole passage in the header and the translation in the footer on every
page. Which verses each page holds is shown to you instead: the transport bar gives the passage
with the live page's verses after it (`Romans 8:28-39 (31–35)`), Next says which verses come up
(`8:36–39`, with the book too where the bar is wide enough), and each page's row in the workspace
is labelled with its verses.

How much lands on each slide follows from the minimum font size in
[Settings → Text Sizing](/settings): a smaller minimum fits more verses per slide, a larger one
splits sooner. Set that by what's readable from the back of your room and the split follows.

### Reference Only

No verse text — just the reference, shown large, with the books either side of it fading out
above and below, and a bar along the bottom marking where the passage falls in the whole Bible,
Old Testament and New.

![A reference-only scripture slide — Romans 8:28-39 shown large, with John and Acts above it and 1 and 2 Corinthians below, fading with distance, over an Old/New Testament progress bar](/screenshots/wayfinding.webp)

This is for a congregation reading along in their own Bibles. The surrounding book names are the
point: someone hunting for Habakkuk can see it sits between Nahum and Zephaniah and thumb toward
it, the way they would flipping through the pages. Two books either side, one fade level per
book regardless of how long the books are, because it's about position in the running order of
the 66 books rather than page count.

Its size is configured separately from full text, under **wayfinding** in
[Settings → Text Sizing](/settings).

::: tip Mixing the two
Nothing says a service has to pick one. A call to worship the leader reads aloud works well as
full text; the sermon passage people are asked to turn to works well as Reference Only. Set them
per item.
:::

## If a reference doesn't resolve

A reference that can't be looked up — a typo, a translation whose key is missing or wrong, or no
connection when using ESV or api.bible — is caught by the readiness check before you start
presenting, with a click-through to the item. See [Presenting](/presenting).

Reference Only items don't need a lookup at all: they show the reference itself, so they keep
working with no key and no connection.

## How it looks

Scripture gets its own [presentation theme](/themes) target, so readings can carry a different
background and typeface from songs without setting it per item — the demo ships exactly that
arrangement. Any single item can still override the theme.

::: tip Related
[Services](/services) covers adding items to a service; [Presenting](/presenting) covers stepping
through the slides live; [Settings](/settings) covers translations and text sizing.
:::
