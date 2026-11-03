/**
 * Couch to 10 Miles — Google Sheet backend (v2: profile keys + private pain ratings).
 *
 * Install / update:
 *   1. Extensions → Apps Script. Replace everything in Code.gs with this file. Save.
 *   2. First install:  Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 *      Updating:       Deploy → Manage deployments → pencil → Version: New version → Deploy.
 *                      (This keeps the same /exec URL, so config.js doesn't change.)
 *
 * Tabs it manages (created automatically):
 *   Runners  — one row per person. D = shared plan data, E = private pain ratings,
 *              F = fingerprint of that person's key. Don't edit D or E by hand.
 *              Lost phone? Clear that person's cell in column F; the next phone that
 *              picks their name takes over the profile.
 *   Workouts — readable list of every logged session (includes pain, so only share this
 *              Sheet with people who may see everyone's ratings).
 *
 * Privacy model: anyone with the /exec URL can read the shared data (names, plans,
 * completion, effort). Pain ratings are returned only to the phone holding that
 * person's key. Saving or deleting a profile requires its key.
 */

const RUNNERS = 'Runners';
const WORKOUTS = 'Workouts';
const HEADER = ['id', 'name', 'updatedAt', 'data (do not edit)', 'private (do not edit)', 'key fingerprint'];
const PRIVATE_FIELDS = ['pain', 'morning'];

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'ping') return json_({ ok: true, version: 2 });
  return json_(snapshot_(null, null));
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, code: 'bad_request', error: 'Bad request body' }); }
  const id = String(body.id || '');
  const token = String(body.token || '');

  if (body.action === 'all') return json_(snapshot_(id, token));

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!/^[a-z0-9]{6,32}$/.test(id)) return json_({ ok: false, code: 'bad_request', error: 'Missing runner id' });
    if (token.length < 12) return json_({ ok: false, code: 'bad_request', error: 'Missing key' });
    const sh = runnersSheet_();
    const at = findRow_(sh, id);
    const row = at > 0 ? sh.getRange(at, 1, 1, 6).getValues()[0] : null;
    const storedHash = row ? String(row[5] || '') : '';
    const hash = hash_(token);

    if (body.action === 'claim') {
      if (!row) return json_({ ok: false, code: 'not_found', error: 'That runner no longer exists.' });
      if (storedHash && storedHash !== hash) return json_({ ok: false, code: 'forbidden', error: 'This profile is already linked to another phone.' });
      sh.getRange(at, 6).setValue(hash);
      return json_(snapshot_(id, token));
    }

    if (row && storedHash && storedHash !== hash) {
      return json_({ ok: false, code: 'forbidden', error: 'This phone does not have the key for this profile.' });
    }

    if (body.action === 'save') {
      if (!body.runner || typeof body.runner !== 'object') return json_({ ok: false, code: 'bad_request', error: 'Missing runner data' });
      const split = split_(body.runner);
      split.pub.updatedAt = new Date().toISOString();
      const values = [id, String(split.pub.name || ''), split.pub.updatedAt, JSON.stringify(split.pub), JSON.stringify(split.priv), hash];
      if (at > 0) sh.getRange(at, 1, 1, 6).setValues([values]);
      else sh.appendRow(values);
      rebuildWorkouts_();
      return json_(snapshot_(id, token));
    }

    if (body.action === 'delete') {
      if (at > 0) sh.deleteRow(at);
      rebuildWorkouts_();
      return json_(snapshot_(null, null));
    }
    return json_({ ok: false, code: 'bad_request', error: 'Unknown action' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- data ---------- */

function snapshot_(id, token) {
  const rows = readRows_();
  const runners = {};
  let authed = false;
  const hash = token ? hash_(token) : '';
  rows.forEach(function (r) {
    const pub = r.pub;
    pub.locked = !!r.hash;
    if (id && r.id === id && r.hash && r.hash === hash) {
      authed = true;
      mergePrivate_(pub, r.priv);
    }
    runners[r.id] = pub;
  });
  return { ok: true, version: 2, runners: runners, authed: authed };
}

function split_(runner) {
  const pub = JSON.parse(JSON.stringify(runner));
  delete pub.locked;
  const priv = {};
  const logs = pub.logs || {};
  Object.keys(logs).forEach(function (date) {
    const L = logs[date] || {};
    PRIVATE_FIELDS.forEach(function (f) {
      if (L[f] !== undefined) {
        if (L[f] !== null) { priv[date] = priv[date] || {}; priv[date][f] = L[f]; }
        delete L[f];
      }
    });
  });
  return { pub: pub, priv: priv };
}

function mergePrivate_(pub, priv) {
  pub.logs = pub.logs || {};
  Object.keys(priv || {}).forEach(function (date) {
    pub.logs[date] = pub.logs[date] || {};
    Object.keys(priv[date]).forEach(function (f) { pub.logs[date][f] = priv[date][f]; });
  });
}

function readRows_() {
  const sh = runnersSheet_();
  const last = sh.getLastRow();
  const out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 6).getValues().forEach(function (r) {
    if (!r[0]) return;
    let pub, priv = {};
    try { pub = JSON.parse(r[3]); } catch (err) { return; }
    try { if (r[4]) priv = JSON.parse(r[4]); } catch (err) { priv = {}; }
    // v1 rows kept pain inside the shared data; move it out on read
    const s = split_(pub);
    Object.keys(s.priv).forEach(function (d) { priv[d] = Object.assign({}, s.priv[d], priv[d] || {}); });
    out.push({ id: String(r[0]), pub: s.pub, priv: priv, hash: String(r[5] || '') });
  });
  return out;
}

/* ---------- sheet helpers ---------- */

function runnersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(RUNNERS);
  if (!sh) sh = ss.insertSheet(RUNNERS);
  const head = sh.getRange(1, 1, 1, HEADER.length).getValues()[0];
  if (head.join('|') !== HEADER.join('|')) {
    sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function rebuildWorkouts_() {
  const header = ['runner', 'date', 'status', 'effort (RPE)', 'pain during', 'pain next morning', 'note'];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(WORKOUTS);
  if (!sh) sh = ss.insertSheet(WORKOUTS);
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sh.setFrozenRows(1);
  const rows = [];
  readRows_().forEach(function (r) {
    const logs = r.pub.logs || {};
    const dates = {};
    Object.keys(logs).forEach(function (d) { dates[d] = 1; });
    Object.keys(r.priv).forEach(function (d) { dates[d] = 1; });
    Object.keys(dates).forEach(function (date) {
      const L = logs[date] || {}, P = r.priv[date] || {};
      const status = L.status || (L.done ? 'done' : '');
      if (!status && L.rpe == null && P.pain == null && P.morning == null) return;
      const v = function (x) { return x == null ? '' : x; };
      rows.push([r.pub.name || r.id, date, status, v(L.rpe), v(P.pain), v(P.morning), L.note || '']);
    });
  });
  rows.sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : String(a[0]).localeCompare(String(b[0])); });
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, Math.max(header.length, sh.getLastColumn())).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
}

function hash_(token) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'c10:' + token, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
