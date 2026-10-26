# Sip & Tell build notes

Decisions for the HTML build. The Figma file is "Drink Microsite"; refined screens are on the "Pages" page.

## Spaces and opening hours
- The Day Café is open 6AM–6PM and The Moon Saloon 6PM–6AM, in the visitor's local time.
- When the site loads with no space in the URL, send the visitor to whichever space is open right now.
- The two-door switch in the header still lets anyone cross over at any time. Each space has its own URL, so links and the back button work. From a drink page the switch goes to the other space's home.
- Colors are set with `data-space="day"` or `data-space="moon"` on `<html>` (see `tokens.css`).

## Color
- Anything pink (`#FF4FA3`) in the Moon Saloon is blue (`#53A8CA`) in the Day Café. That includes text, fills, outlines and tints.
- Text on a solid accent fill is ink (`#15141B`) in both spaces.
- Known exception: Day blue text on cream is 2.3:1, below WCAG AA. This is an accepted design choice.

## Drinks
- Only drinks with `published: true` in `data/drinks.json` get a page. Right now that's London Fog and Margarita.
- Unpublished drinks still appear in the menu list, but they're **not clickable**: no link, no hover state, no popup and no pointer cursor. Mark them `aria-disabled="true"`.

## Stories and counts
- All counts use the real number of approved stories: "Based on 3 stories", "3 stories shared" and the menu popup pill.
- Answer bars show each answer's share of the stories, with no "Other" group until there are more than 3 distinct answers. Segment widths are proportional to the counts.
- Summary sentence:
  - If one answer leads each question: "Most people reach for a {drink} while {occasion}, {company phrase}, and say it tastes like {taste}."
  - If there's no clear favorite (a tie at the top): "So far, people have reached for a {drink} {occasion 1}, {occasion 2}, and {occasion 3}."
- Ties in "today's special" (the hero rows, popup tags and highlighted ticker item) go to the most recent story.
- The "tastes like…" ticker: each published drink in the space with stories claims its top taste (the special first). Those tastes are outlined pills that swap the hero to that drink; the picked one is solid. The rest scroll by as plain text. A non-special hero is labeled "Also brewing today" / "Also pouring tonight".
- Zero stories: use the "No stories yet" layouts (Figma: "Drink Page: … / No stories yet").
- Story links such as "See community stories" and "3 stories shared" go to `drink-page#stories`.

## Download recipe → JPEG
Figma: "Recipe JPEG / Web / …" (under the desktop recipe components) and "Recipe JPEG / Mobile / …" (under the mobile recipe components). Each frame has a JPG @2x export setting.
- **Web** (desktop download): 1200 × 850 layout, saved at 2400 × 1700. Illustration card (accent-60) on the left. On the right, top to bottom:
  - logo with the space name and hours
  - drink mark and name (Display)
  - tagline (header italic, accent)
  - current setting in accent meta, e.g. "Hot / oz / Serves 1"
  - ingredients and method, styled exactly as in the recipe component
  - footer
- **Mobile**: 540 × 810 layout, saved at 1080 × 1620 (2:3 portrait). Logo row, then the illustration card (it takes whatever height is left), then mark + name, setting, ingredients, method and footer.
- The JPEG always reflects the reader's current version, units and serving count.
- Build approach: render a hidden copy of this layout at 2× with `html2canvas` / `modern-screenshot`, then download it as `sip-and-tell-{drink}-{version}-{units}-serves-{n}.jpg`. Use the web layout above 768px and the mobile layout below it.
- **Current build:** downloads serve the exported cards in `assets/recipe-cards/{drink}-{web|mobile}.jpg` (first version / oz / serves 1), picking the mobile card below 768px. Drinks without an exported card (Cosmopolitan for now) show no download button. The live render above is a possible later upgrade.

## Story submissions → Google Sheet (for now)
- The questionnaire POSTs to a Google Apps Script web app, which appends a row to a Google Sheet. Columns are in `data/stories-sheet-template.csv`.
- Script: `scripts/stories-apps-script.gs` (paste into the sheet's Extensions → Apps Script, deploy as a web app: execute as Me, access Anyone). The site POSTs JSON as plain text (no preflight) and GETs `?drink=<id>` for approved stories.
- New rows come in with `approved = FALSE`. Caroline sets rows to `TRUE` to publish them.
- The site reads approved stories from the same Apps Script (GET, JSON). Cache them so page loads stay fast.
- Later: move to a database (Supabase or Firebase) when we want instant publishing or moderation tools. The row shape stays the same.
- Privacy: no email or contact fields. The Story step says stories are public and that "Anonymous" is fine.
- Story step (step 6) asks for two things, both required: a **note** ("What would you tell the next person who orders this?", 280 characters max) and **Sign as**. Submit validates both. There are no who/where/why fields.

## Not built yet
- Mobile (390) and tablet (768) layouts: Figma mockups in progress.
- Pages for the other six drinks: waiting on illustrations and content.

## Interaction states
Figma: "Interaction states / Day Café" and "/ Moon Saloon", to the right of the desktop questionnaire edge cases.
- **Hover** (desktop only, `@media (hover: hover)`):
  - Solid buttons go to `--accent-60`.
  - Outline buttons go to `--accent-10` with an accent outline.
  - Chips get an accent outline and accent text.
  - Links turn accent and underlined.
  - A menu row fills with the accent and opens its popup.
- **Focus** (`:focus-visible`): `outline: 2px solid var(--accent); outline-offset: 2px;` on everything you can tap. The text field's focus is its typing state: a 2px accent border.
- **Pressed** (`:active`): solid buttons invert to an `--ink` fill with `--page` text. Everything else takes `--accent-30`. Mobile uses Pressed in place of Hover.
- **Selected**: an answer chip or option takes an accent fill or outline (see Figma). For links, `aria-current="page"` turns the link accent.
- **Disabled**: `opacity: .4`. That covers the stepper's − at 1 serving and + at 3, answer options after the pick limit, and Next until a required step is answered.
- **Unpublished menu rows**: `opacity: .4`, no hover, no pointer, `aria-disabled="true"`.
