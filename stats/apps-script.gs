/**
 * Rodaina Planner usage stats. Bound to a Google Sheet; deploy as a Web app (Execute as: Me, Access: Anyone).
 * Receives one small JSON ping per device per day. Never receives planner content.
 */
var USER_HEADERS = ['deviceId', 'name', 'firstSeen', 'lastSeen', 'daysUsed', 'installed', 'platform', 'lang'];
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function doGet() { return ContentService.createTextOutput('ok'); }

function doPost(e) {
  var ping = parse_(e);
  if (!ping) return ContentService.createTextOutput('ok');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var users = sheet_(ss, 'Users', USER_HEADERS);
    var daily = sheet_(ss, 'Daily', ['day', 'deviceId']);
    ensureSummary_(ss);

    var last = users.getLastRow();
    var ids = last > 1 ? users.getRange(2, 1, last - 1, 1).getValues() : [];
    var row = -1;
    for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]) === ping.deviceId) { row = i + 2; break; } }

    if (row === -1) {
      users.appendRow([ping.deviceId, ping.name, ping.day, ping.day, 1, ping.installed, ping.platform, ping.lang]);
      daily.appendRow([ping.day, ping.deviceId]);
    } else {
      var cur = users.getRange(row, 1, 1, 8).getValues()[0];
      var lastSeen = normDay_(cur[3]);
      var isNewDay = lastSeen !== ping.day;
      // Name follows consent: empty means the user withdrew it, so clear it.
      users.getRange(row, 2).setValue(ping.name);
      users.getRange(row, 6, 1, 3).setValues([[ping.installed, ping.platform, ping.lang]]);
      if (isNewDay) {
        users.getRange(row, 4).setValue(ping.day);
        users.getRange(row, 5).setValue((Number(cur[4]) || 0) + 1);
        daily.appendRow([ping.day, ping.deviceId]);
      }
    }
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

function parse_(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (!p || p.v !== 1) return null;
    if (typeof p.deviceId !== 'string' || p.deviceId.length < 1 || p.deviceId.length > 64) return null;
    if (typeof p.day !== 'string' || !DAY_RE.test(p.day)) return null;
    if (typeof p.name !== 'string' || p.name.length > 60) return null;
    return {
      deviceId: p.deviceId,
      day: p.day,
      name: clean_(p.name),
      installed: p.installed === true,
      platform: clean_(typeof p.platform === 'string' ? p.platform : '').slice(0, 20),
      lang: clean_(typeof p.lang === 'string' ? p.lang : '').slice(0, 16)
    };
  } catch (err) { return null; }
}

// Stops spreadsheet formula injection (=, +, -, @) and control characters in free text.
function clean_(s) {
  s = String(s).replace(/[\u0000-\u001f]/g, ' ').trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function normDay_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v);
}

function sheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    // Keep dates as plain text so they compare reliably.
    if (name === 'Users') sh.getRange('C:D').setNumberFormat('@');
    if (name === 'Daily') sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}

function ensureSummary_(ss) {
  if (ss.getSheetByName('Summary')) return;
  var s = ss.insertSheet('Summary', 0);
  var tz = 'yyyy-mm-dd';
  s.getRange('A1:B1').setValues([['Rodaina Planner usage', '']]).setFontWeight('bold');
  s.getRange('A3:A7').setValues([['Total users'], ['Installed to home screen'], ['Active today'], ['Active last 7 days (unique devices)'], ['Average days used per user']]);
  s.getRange('B3').setFormula('=COUNTA(Users!A2:A)');
  s.getRange('B4').setFormula('=COUNTIF(Users!F2:F,TRUE)');
  s.getRange('B5').setFormula('=COUNTIF(Daily!A2:A,TEXT(TODAY(),"' + tz + '"))');
  s.getRange('B6').setFormula('=IFERROR(COUNTA(UNIQUE(FILTER(Daily!B2:B,Daily!A2:A>=TEXT(TODAY()-6,"' + tz + '")))),0)');
  s.getRange('B7').setFormula('=IFERROR(ROUND(AVERAGE(Users!E2:E),1),0)');
  s.getRange('A9:B9').setValues([['Day (last 30)', 'Active users']]).setFontWeight('bold');
  for (var i = 0; i < 30; i++) {
    var r = 10 + i;
    s.getRange(r, 1).setFormula('=TEXT(TODAY()-' + i + ',"' + tz + '")');
    s.getRange(r, 2).setFormula('=COUNTIF(Daily!A$2:A,A' + r + ')');
  }
  s.setColumnWidth(1, 280);
}
