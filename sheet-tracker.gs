// Healingplant slot tracker.
//
// This creates a private Google Sheet named "Healingplant bookings" in the
// Google Drive of the account that deploys it. The website can add rows and
// can read which times are taken. It cannot read anyone's name, phone, or email.
//
// One-time setup:
// 1. Open https://script.google.com while signed in as the Healingplant account.
// 2. Click New project. Delete the sample code and paste this whole file.
// 3. Click Deploy, then New deployment, then the gear, then Web app.
// 4. Set Execute as: Me. Set Who has access: Anyone. Click Deploy and allow access.
// 5. Copy the Web app URL into config.js as sheetUrl, then upload config.js.
// 6. Open that Web app URL once. The sheet appears in Google Drive.
//
// If you change the session times in config.js, change SLOTS below to match.

var SLOTS = ["10:00", "11:30", "16:00", "17:30", "19:00", "20:30"];
var HEADERS = [
  "Recorded at",
  "Updated at",
  "Booking id",
  "Date",
  "Time",
  "Name",
  "Age",
  "Gender",
  "Phone",
  "Email",
  "Status",
  "UPI reference",
];

function doGet(e) {
  var mine = e && e.parameter ? String(e.parameter.mine || "") : "";
  return json_(withLock_(function () {
    return listSlots_(mine);
  }));
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
  } catch (error) {
    return json_({ ok: false });
  }
  return json_(withLock_(function () {
    if (data.action === "paid") return markPaid_(data);
    if (data.action === "block") return blockSlot_(data);
    return { ok: false };
  }));
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function tracker_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  var book;
  if (id) {
    book = SpreadsheetApp.openById(id).getSheetByName("Bookings");
  }
  if (!book) {
    var created = SpreadsheetApp.create("Healingplant bookings");
    book = created.getSheets()[0];
    book.setName("Bookings");
    book.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    book.setFrozenRows(1);
    book.getRange(1, 1, book.getMaxRows(), HEADERS.length).setNumberFormat("@");
    props.setProperty("SHEET_ID", created.getId());
  }
  return book;
}

function listSlots_(mine) {
  var values = tracker_().getDataRange().getValues();
  var blocked = [];
  var own = null;
  for (var i = 1; i < values.length; i++) {
    var status = text_(values[i][10]);
    if (status !== "Blocked" && status !== "Paid") continue;
    var date = dateText_(values[i][3]);
    var time = timeText_(values[i][4]);
    if (!date || !time) continue;
    if (mine && text_(values[i][2]) === mine) {
      own = { date: date, time: time, status: status };
      continue;
    }
    blocked.push(date + "|" + time);
  }
  return { ok: true, blocked: blocked, mine: own };
}

function blockSlot_(data) {
  var slot = checkedSlot_(data);
  if (!slot) return { ok: false };
  var sheet = tracker_();
  var taken = findSlot_(sheet, slot.date, slot.time, slot.id);
  if (taken > 0) return { ok: false, taken: true };
  var row = findId_(sheet, slot.id);
  var now = now_();
  if (row > 0 && text_(sheet.getRange(row, 11).getValue()) === "Paid") {
    return { ok: true, date: dateText_(sheet.getRange(row, 4).getValue()), time: timeText_(sheet.getRange(row, 5).getValue()), status: "Paid" };
  }
  var record = [
    row > 0 ? text_(sheet.getRange(row, 1).getValue()) : now,
    now,
    slot.id,
    slot.date,
    slot.time,
    clean_(data.name, 80),
    clean_(data.age, 3),
    clean_(data.gender, 40),
    clean_(data.phone, 20),
    clean_(data.email, 120),
    "Blocked",
    row > 0 ? text_(sheet.getRange(row, 12).getValue()) : "",
  ];
  if (row > 0) sheet.getRange(row, 1, 1, HEADERS.length).setValues([record]);
  else sheet.appendRow(record);
  return { ok: true, date: slot.date, time: slot.time, status: "Blocked" };
}

function markPaid_(data) {
  var slot = checkedSlot_(data);
  if (!slot) return { ok: false };
  var sheet = tracker_();
  var row = findId_(sheet, slot.id);
  var now = now_();
  if (row < 0) {
    sheet.appendRow([
      now,
      now,
      slot.id,
      slot.date,
      slot.time,
      clean_(data.name, 80),
      clean_(data.age, 3),
      clean_(data.gender, 40),
      clean_(data.phone, 20),
      clean_(data.email, 120),
      "Paid",
      clean_(data.utr, 30),
    ]);
    return { ok: true };
  }
  var taken = findSlot_(sheet, slot.date, slot.time, slot.id);
  if (taken > 0) return { ok: false, taken: true };
  sheet.getRange(row, 2).setValue(now);
  sheet.getRange(row, 4).setValue(slot.date);
  sheet.getRange(row, 5).setValue(slot.time);
  sheet.getRange(row, 11).setValue("Paid");
  sheet.getRange(row, 12).setValue(clean_(data.utr, 30));
  return { ok: true };
}

function checkedSlot_(data) {
  var id = clean_(data.id, 80);
  var date = dateText_(data.date);
  var time = timeText_(data.time);
  if (!/^[A-Za-z0-9-]{16,80}$/.test(id)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (SLOTS.indexOf(time) < 0) return null;
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  var end = Utilities.formatDate(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), "Asia/Kolkata", "yyyy-MM-dd");
  if (date < today || date > end) return null;
  return { id: id, date: date, time: time };
}

function findId_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (text_(values[i][2]) === id) return i + 1;
  }
  return -1;
}

function findSlot_(sheet, date, time, exceptId) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var status = text_(values[i][10]);
    if (status !== "Blocked" && status !== "Paid") continue;
    if (text_(values[i][2]) === exceptId) continue;
    if (dateText_(values[i][3]) === date && timeText_(values[i][4]) === time) return i + 1;
  }
  return -1;
}

function now_() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
}

function text_(value) {
  return String(value || "").replace(/^\s+|\s+$/g, "");
}

function clean_(value, max) {
  return text_(value).replace(/[\u0000-\u001F]/g, " ").slice(0, max);
}

function dateText_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Kolkata", "yyyy-MM-dd");
  }
  var match = text_(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function timeText_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Kolkata", "HH:mm");
  }
  var match = text_(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  var hour = ("0" + match[1]).slice(-2);
  return hour + ":" + match[2];
}
