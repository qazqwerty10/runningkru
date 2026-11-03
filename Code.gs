/**
 * Couch to 10 Miles — Google Sheet backend.
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web app URL (ends in /exec) and put it in config.js.
 *
 * Tabs it manages (created automatically on first use):
 *   Runners  — one row per person; column D holds the app's full plan data. Don't edit D by hand.
 *   Workouts — a readable copy of every logged session, rebuilt whenever someone saves.
 */

const RUNNERS = 'Runners';
const WORKOUTS = 'Workouts';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'all';
  if (action === 'ping') return json_({ ok: true });
  return json_({ ok: true, runners: readAll_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'Bad request body' }); }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'save') {
      const id = String(body.id || '');
      if (!/^[a-z0-9]{6,32}$/.test(id) || !body.runner || typeof body.runner !== 'object') {
        return json_({ ok: false, error: 'Missing runner id or data' });
      }
      const runner = body.runner;
      runner.updatedAt = new Date().toISOString();
      upsert_(id, runner);
      rebuildWorkouts_();
      return json_({ ok: true, runners: readAll_() });
    }
    if (body.action === 'delete') {
      remove_(String(body.id || ''));
      rebuildWorkouts_();
      return json_({ ok: true, runners: readAll_() });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function runnersSheet_() {
  return sheet_(RUNNERS, ['id', 'name', 'updatedAt', 'data (do not edit)']);
}

function readAll_() {
  const sh = runnersSheet_();
  const last = sh.getLastRow();
  const out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (r) {
    if (!r[0]) return;
    try { out[r[0]] = JSON.parse(r[3]); } catch (err) { /* skip a damaged row */ }
  });
  return out;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function upsert_(id, runner) {
  const sh = runnersSheet_();
  const row = [id, String(runner.name || ''), runner.updatedAt, JSON.stringify(runner)];
  const at = findRow_(sh, id);
  if (at > 0) sh.getRange(at, 1, 1, 4).setValues([row]);
  else sh.appendRow(row);
}

function remove_(id) {
  const sh = runnersSheet_();
  const at = findRow_(sh, id);
  if (at > 0) sh.deleteRow(at);
}

function rebuildWorkouts_() {
  const header = ['runner', 'date', 'completed', 'effort (RPE)', 'pain during', 'pain next morning'];
  const sh = sheet_(WORKOUTS, header);
  const rows = [];
  const all = readAll_();
  Object.keys(all).forEach(function (id) {
    const r = all[id], logs = r.logs || {};
    Object.keys(logs).sort().forEach(function (date) {
      const L = logs[date] || {};
      if (!L.done && L.rpe == null && L.pain == null) return;
      rows.push([r.name || id, date, L.done ? 'yes' : 'no',
        L.rpe == null ? '' : L.rpe, L.pain == null ? '' : L.pain, L.morning == null ? '' : L.morning]);
    });
  });
  rows.sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : String(a[0]).localeCompare(String(b[0])); });
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, header.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
