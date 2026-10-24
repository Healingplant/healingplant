// Healingplant settings.
// Change the fee and the session times here, save, then upload this file to GitHub again.

window.HEALINGPLANT = {
  // What a person pays. pay-qr.png must use this same amount.
  sessionFeeInr: 99,

  // How long one session lasts.
  sessionMinutes: 50,

  // Booking emails go here. The client gets a confirmation. This address gets every detail.
  counsellorEmail: "healingplant123@gmail.com",

  // A calendar blocker is emailed here as soon as a day and time are chosen.
  blockerEmail: "healplant123@gmail.com",

  // Apps Script web app URL from sheet-tracker.gs. The sheet records each hold.
  // Until this is filled in, the page cannot hide a time that someone else has taken.
  sheetUrl: "https://script.google.com/macros/s/AKfycbyUcMS8GXt0RpeM9drRTOISFotR_rVY6vFVf3-oIAzpSQhK8SpyjEuboxhU1XAlhBph5A/exec",

  // Leave blank. After FormSubmit is activated it can give you a random form address.
  // Paste that full https://formsubmit.co/... address here if you want to hide your email in the code.
  formEndpoint: "",

  // Used only to build the QR. The UPI ID is not shown on the page.
  // pay-qr.png asks the UPI app for Rs 99 (am=99.00).
  upiId: "aahilshigli123@okhdfcbank",
  upiName: "Aahil Khan",
  qrImage: "pay-qr.png",

  // Every session is shown in India Standard Time.
  timezone: "Asia/Kolkata",
  timezoneLabel: "IST",

  // How far ahead someone can book.
  // Weekdays: 0 Sunday, 1 Monday, 2 Tuesday, 3 Wednesday, 4 Thursday, 5 Friday, 6 Saturday.
  daysAhead: 21,
  openWeekdays: [1, 2, 3, 4, 5, 6],

  // Start times, 24-hour clock, IST. A time disappears once it is under 4 hours away,
  // so there is time to send the Zoom link.
  slots: ["10:00", "11:30", "16:00", "17:30", "19:00", "20:30"],
  minimumNoticeHours: 4,
};
