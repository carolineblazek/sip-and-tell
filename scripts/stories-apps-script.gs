/**
 * Sip & Tell / story submissions
 * Bound to the "Sip & Tell" Google Sheet. Deploy as a web app:
 *   Execute as: Me    Who has access: Anyone
 *
 * POST  -> adds a story as a new row with approved = FALSE (nothing goes public until you tick it)
 * GET   -> returns approved stories as JSON, newest first. Optional ?drink=london-fog
 *
 * The first tab's header row must match data/stories-sheet-template.csv:
 * submitted_at, approved, drink_id, space, occasion, moment, tastes_like, company, review, note, signed_as
 */

const DRINKS = {
  'london-fog': 'day', 'mimosa': 'day', 'matcha': 'day', 'boba-tea': 'day',
  'margarita': 'moon', 'cosmopolitan': 'moon', 'spritz': 'moon', 'shirley-temple': 'moon',
};
const LIMITS = { occasion: 40, moment: 80, tastes_like: 60, company: 40, review: 40, note: 280, signed_as: 40 };
const REQUIRED = ['drink_id', 'occasion', 'moment', 'tastes_like', 'company', 'review', 'note', 'signed_as'];

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map((h) => String(h).trim());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Strip characters that would make a cell run as a formula, and trim to the field's limit.
function clean_(value, max) {
  let s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: a hidden field real people never fill in.
    if (body.website) return json_({ ok: true });

    const row = {};
    Object.keys(LIMITS).forEach((k) => { row[k] = clean_(body[k], LIMITS[k]); });
    row.drink_id = String(body.drink_id || '');
    if (!DRINKS[row.drink_id]) return json_({ ok: false, error: 'unknown_drink' });
    row.space = DRINKS[row.drink_id];

    const missing = REQUIRED.filter((k) => !row[k]);
    if (missing.length) return json_({ ok: false, error: 'missing', fields: missing });

    row.submitted_at = new Date().toISOString();
    row.approved = false;

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = sheet_();
      const head = headers_(sh);
      sh.appendRow(head.map((h) => (h in row ? row[h] : '')));
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  }
}

function doGet(e) {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  const head = values.shift().map((h) => String(h).trim());
  const col = (name) => head.indexOf(name);
  const drink = e && e.parameter && e.parameter.drink;

  const stories = values
    .filter((r) => r[col('approved')] === true || String(r[col('approved')]).toUpperCase() === 'TRUE')
    .filter((r) => !drink || r[col('drink_id')] === drink)
    .map((r) => ({
      drinkId: r[col('drink_id')],
      submittedAt: r[col('submitted_at')] instanceof Date ? r[col('submitted_at')].toISOString() : String(r[col('submitted_at')]),
      occasion: r[col('occasion')],
      moment: r[col('moment')],
      tastesLike: r[col('tastes_like')],
      company: r[col('company')],
      review: r[col('review')],
      note: r[col('note')],
      signedAs: r[col('signed_as')],
    }))
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

  return json_({ ok: true, stories });
}
