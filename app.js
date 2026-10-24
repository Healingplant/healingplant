(function () {
  const cfg = window.HEALINGPLANT;
  const STORAGE_KEY = "healingplant-booking";
  const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

  const $ = (id) => document.getElementById(id);

  const state = {
    details: null,
    date: null,
    time: null,
    showAllDays: false,
    submitting: false,
  };

  let preferred = null;
  let currentDays = [];

  function clean(value) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function feeLabel() {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(cfg.sessionFeeInr));
  }

  function ajaxEndpoint() {
    const base = cfg.formEndpoint || "https://formsubmit.co/" + cfg.counsellorEmail;
    return base.replace("https://formsubmit.co/", "https://formsubmit.co/ajax/");
  }

  function todayISO() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: cfg.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const map = {};
    parts.forEach((part) => {
      map[part.type] = part.value;
    });
    return map.year + "-" + map.month + "-" + map.day;
  }

  function addDaysISO(iso, days) {
    const bits = iso.split("-").map(Number);
    const date = new Date(Date.UTC(bits[0], bits[1] - 1, bits[2] + days, 12, 0, 0));
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return date.getUTCFullYear() + "-" + month + "-" + day;
  }

  function weekdayIndex(iso) {
    const bits = iso.split("-").map(Number);
    return new Date(Date.UTC(bits[0], bits[1] - 1, bits[2], 12, 0, 0)).getUTCDay();
  }

  function slotDate(iso, time) {
    return new Date(iso + "T" + time + ":00+05:30");
  }

  function validSlot(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function isBookable(iso, time) {
    const notice = Number(cfg.minimumNoticeHours) * 60 * 60 * 1000;
    return slotDate(iso, time).getTime() >= Date.now() + notice;
  }

  function availableDays() {
    const open = new Set(cfg.openWeekdays.map(Number));
    const slots = cfg.slots.filter(validSlot);
    const start = todayISO();
    const days = [];
    for (let i = 0; i < Number(cfg.daysAhead); i += 1) {
      const iso = addDaysISO(start, i);
      if (!open.has(weekdayIndex(iso))) continue;
      const times = slots.filter((time) => isBookable(iso, time));
      if (times.length) days.push({ iso: iso, times: times });
    }
    return days;
  }

  const longDateFormat = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortWeekday = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  });

  const shortMonth = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
  });

  const dayNumber = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
  });

  function longDate(iso) {
    return longDateFormat.format(slotDate(iso, "12:00"));
  }

  function timeLabel(hhmm) {
    const bits = hhmm.split(":").map(Number);
    const suffix = bits[0] >= 12 ? "PM" : "AM";
    const hour = bits[0] % 12 || 12;
    return hour + ":" + String(bits[1]).padStart(2, "0") + " " + suffix;
  }

  function upcomingSlots(limit) {
    const found = [];
    availableDays().forEach((day) => {
      day.times.forEach((time) => {
        if (found.length < limit) found.push({ iso: day.iso, time: time });
      });
    });
    return found;
  }

  function scrollToBook() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("book").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function applyStaticText() {
    const fee = feeLabel();
    document.querySelectorAll("[data-fee]").forEach((node) => {
      node.textContent = fee;
    });
    document.querySelectorAll("[data-minutes]").forEach((node) => {
      node.textContent = String(cfg.sessionMinutes);
    });
    document.querySelectorAll("[data-email]").forEach((node) => {
      node.textContent = cfg.counsellorEmail;
      if (node.tagName === "A") node.href = "mailto:" + cfg.counsellorEmail;
    });
    $("upi-name").textContent = cfg.upiName;
    const qr = $("qr");
    qr.src = cfg.qrImage;
    qr.alt = "UPI QR code for " + feeLabel() + ". Payee " + cfg.upiName + ".";
  }

  function renderSoon() {
    const list = $("soon-list");
    list.replaceChildren();
    const slots = upcomingSlots(4);
    if (!slots.length) {
      const item = document.createElement("li");
      item.textContent = "New times are added every morning.";
      list.append(item);
      return;
    }
    slots.forEach((slot) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const label = longDate(slot.iso) + " · " + timeLabel(slot.time);
      button.textContent = label;
      button.addEventListener("click", () => {
        preferred = slot;
        state.showAllDays = true;
        scrollToBook();
        $("name").focus();
      });
      item.append(button);
      list.append(item);
    });
  }

  function setFieldError(fieldName, message) {
    const field = $(fieldName);
    const error = $(fieldName + "-error");
    if (!field || !error) return;
    if (message) {
      field.setAttribute("aria-invalid", "true");
      error.hidden = false;
      error.textContent = message;
    } else {
      field.removeAttribute("aria-invalid");
      error.hidden = true;
      error.textContent = "";
    }
  }

  function clearDetailErrors() {
    ["name", "age", "gender", "phone", "email", "consent"].forEach((name) => setFieldError(name, ""));
    const banner = $("details-error");
    banner.hidden = true;
    banner.textContent = "";
  }

  function validateDetails(form) {
    const errors = {};
    const name = clean(form.name.value);
    const age = Number(form.age.value);
    const gender = form.gender.value;
    const phoneRaw = clean(form.phone.value);
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    const phone = (phoneRaw.startsWith("+") ? "+" : "") + phoneDigits;
    const email = clean(form.email.value).toLowerCase();

    if (name.length < 2 || !/\p{L}/u.test(name)) errors.name = "Please enter the name of the person attending.";
    if (!Number.isInteger(age) || age < 6 || age > 100) errors.age = "Please enter an age from 6 to 100.";
    if (!GENDERS.includes(gender)) errors.gender = "Please select a gender.";
    if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = "Please enter a phone number with at least 10 digits.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";
    if (!form.consent.checked) errors.consent = "Please confirm we may contact you about this booking.";

    return {
      errors: errors,
      values: { name: name, age: age, gender: gender, phone: phone, email: email },
    };
  }

  function showDetails(event) {
    event.preventDefault();
    clearDetailErrors();
    const result = validateDetails(event.currentTarget);
    const names = Object.keys(result.errors);
    if (names.length) {
      names.forEach((name) => setFieldError(name, result.errors[name]));
      const banner = $("details-error");
      banner.hidden = false;
      banner.textContent = "Please fix the highlighted fields.";
      const first = event.currentTarget.querySelector("[aria-invalid='true']");
      if (first) first.focus();
      return;
    }

    state.details = result.values;
    $("who-summary").textContent =
      result.values.name +
      " · " +
      result.values.age +
      " · " +
      result.values.gender +
      " · " +
      result.values.phone +
      " · " +
      result.values.email;
    $("guardian-note").hidden = result.values.age >= 18;
    $("step-details").hidden = true;
    $("step-pay").hidden = false;
    $("pay-error").hidden = true;
    state.date = null;
    state.time = null;
    renderDays();
    $("step-live").textContent = "Choose a day, a time, and pay with the QR code.";
    $("pay-title").focus();
  }

  function renderDays() {
    currentDays = availableDays();
    const box = $("day-grid");
    box.replaceChildren();
    const empty = $("days-empty");
    if (!currentDays.length) {
      empty.hidden = false;
      $("time-block").hidden = true;
      return;
    }
    empty.hidden = true;

    if (preferred && currentDays.some((day) => day.iso === preferred.iso)) {
      state.showAllDays = true;
    }

    const visible = state.showAllDays ? currentDays : currentDays.slice(0, 6);
    const today = todayISO();
    visible.forEach((day) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";
      button.dataset.iso = day.iso;
      button.setAttribute("aria-pressed", day.iso === state.date ? "true" : "false");

      const weekday = document.createElement("span");
      weekday.className = "day-wd";
      weekday.textContent = day.iso === today ? "Today" : shortWeekday.format(slotDate(day.iso, "12:00"));

      const number = document.createElement("span");
      number.className = "day-num";
      number.textContent = dayNumber.format(slotDate(day.iso, "12:00"));

      const month = document.createElement("span");
      month.className = "day-mo";
      month.textContent = shortMonth.format(slotDate(day.iso, "12:00"));

      button.append(weekday, number, month);
      box.append(button);
    });

    const more = $("more-days");
    more.hidden = state.showAllDays || currentDays.length <= 6;

    if (preferred) {
      const match = currentDays.find((day) => day.iso === preferred.iso && day.times.includes(preferred.time));
      if (match) selectDay(match.iso, preferred.time);
      preferred = null;
    } else if (state.date) {
      selectDay(state.date, state.time);
    } else {
      $("time-block").hidden = true;
      updateChoice();
    }
  }

  function selectDay(iso, time) {
    const day = currentDays.find((item) => item.iso === iso);
    if (!day) return;
    state.date = iso;
    state.time = time && day.times.includes(time) ? time : null;
    document.querySelectorAll("#day-grid .day").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.iso === iso ? "true" : "false");
    });
    renderTimes(day.times);
    updateChoice();
  }

  function renderTimes(times) {
    const block = $("time-block");
    const box = $("time-grid");
    block.hidden = false;
    box.replaceChildren();
    times.forEach((time) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time";
      button.dataset.time = time;
      button.textContent = timeLabel(time);
      button.setAttribute("aria-pressed", time === state.time ? "true" : "false");
      box.append(button);
    });
  }

  function updateChoice() {
    const line = $("choice");
    if (state.date && state.time) {
      line.textContent = longDate(state.date) + ", " + timeLabel(state.time) + " " + cfg.timezoneLabel;
    } else {
      line.textContent = "No time selected yet.";
    }
  }

  function payError(message) {
    const node = $("pay-error");
    node.hidden = !message;
    node.textContent = message || "";
  }

  function confirmationMessage(booking) {
    return [
      "Hello " + booking.name + ",",
      "",
      "Your Healingplant counselling session is confirmed.",
      "",
      "When: " + booking.dateLabel + ", " + booking.timeLabel + " " + cfg.timezoneLabel,
      "Length: " + cfg.sessionMinutes + " minutes",
      "Where: Zoom",
      "Fee: " + booking.fee,
      "UPI reference: " + booking.utr,
      "",
      "You will receive a Zoom link and the passcode to join 4 hours before the session. Please check this inbox, including spam, around that time.",
      "",
      "If you need to reschedule, email " + cfg.counsellorEmail + " and include your UPI reference.",
      "",
      "Warmly,",
      "Healingplant",
    ].join("\n");
  }

  function submitBooking(event) {
    event.preventDefault();
    if (state.submitting) return;
    payError("");

    if (!state.date || !state.time) {
      payError("Choose a day and a time.");
      $("day-grid").focus();
      return;
    }

    const utr = clean($("utr").value).replace(/\s+/g, "");
    if (!/^[A-Za-z0-9-]{6,30}$/.test(utr)) {
      payError("Enter the UPI reference from your payment. It is usually 12 digits.");
      $("utr").focus();
      return;
    }

    if (!Number(cfg.sessionFeeInr) || Number(cfg.sessionFeeInr) <= 0) {
      payError("The session fee is not set. Please contact Healingplant before paying.");
      return;
    }

    if (window.location.protocol === "file:") {
      payError("Open this site from its GitHub Pages link. Email cannot be sent from a file on your computer.");
      return;
    }

    const details = state.details;
    const booking = {
      name: details.name,
      age: details.age,
      gender: details.gender,
      phone: details.phone,
      email: details.email,
      dateLabel: longDate(state.date),
      timeLabel: timeLabel(state.time),
      fee: feeLabel(),
      minutes: cfg.sessionMinutes,
      utr: utr,
    };

    state.submitting = true;
    $("pay-btn").disabled = true;
    $("pay-btn").textContent = "Sending your confirmation…";

    // CC sends the same email to the address the person typed.
    // FormSubmit does not deliver its autoresponse on this kind of request.
    const payload = {
      _subject: "Your Healingplant booking is confirmed",
      _template: "table",
      _captcha: "false",
      _cc: booking.email,
      _replyto: cfg.counsellorEmail,
      _url: window.location.href.split("#")[0],
      email: booking.email,
      "Booking confirmation": confirmationMessage(booking),
      Name: booking.name,
      Age: String(booking.age),
      Gender: booking.gender,
      Phone: booking.phone,
      "Session date": booking.dateLabel,
      "Session time": booking.timeLabel + " " + cfg.timezoneLabel,
      Duration: cfg.sessionMinutes + " minutes",
      Fee: booking.fee,
      "UPI reference": booking.utr,
      Payee: cfg.upiName,
      Reminder: "Match the UPI reference, then send the Zoom link and passcode 4 hours before the session.",
    };

    sendConfirmation(payload, booking);
  }

  async function sendConfirmation(payload, booking) {
    try {
      const response = await fetch(ajaxEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (String(data.success) !== "true") {
        const failure = new Error(data.message || "Email was not sent.");
        if (isActivationMessage(data.message)) {
          finishConfirmed(booking);
          return;
        }
        throw failure;
      }
    } catch (error) {
      if (isActivationMessage(error && error.message)) {
        finishConfirmed(booking);
        return;
      }
      state.submitting = false;
      $("pay-btn").disabled = false;
      $("pay-btn").textContent = "I have paid";
      payError("The confirmation could not be sent. Please press I have paid again.");
      return;
    }

    finishConfirmed(booking);
  }

  function isActivationMessage(message) {
    return /activ/i.test(String(message || ""));
  }

  function finishConfirmed(booking) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
    } catch (error) {
      // The confirmation screen still works without the saved summary.
    }

    const url = new URL(window.location.href);
    url.searchParams.set("booked", "1");
    history.replaceState({}, "", url);
    showDone();
    const pop = $("confirm-pop");
    if (pop && typeof pop.showModal === "function" && !pop.open) pop.showModal();
  }

  function fillFacts(pairs) {
    const list = $("done-facts");
    list.replaceChildren();
    pairs.forEach((pair) => {
      const term = document.createElement("dt");
      term.textContent = pair[0];
      const value = document.createElement("dd");
      value.textContent = pair[1];
      list.append(term, value);
    });
  }

  function showDone() {
    $("step-details").hidden = true;
    $("step-pay").hidden = true;
    $("step-done").hidden = false;
    document.title = "Booking confirmed · Healingplant";

    let data = null;
    try {
      data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      data = null;
    }

    if (data && data.name && data.email) {
      $("done-title").textContent = "Booking is confirmed.";
      $("done-lead").textContent = "You will receive a confirmation email soon.";
      fillFacts([
        ["Session", data.dateLabel + ", " + data.timeLabel + " " + cfg.timezoneLabel],
        ["Length", data.minutes + " minutes"],
        ["Fee", data.fee],
        ["UPI reference", data.utr],
      ]);
      $("done-facts").hidden = false;
    } else {
      $("done-title").textContent = "Booking is confirmed.";
      $("done-lead").textContent = "You will receive a confirmation email soon.";
      $("done-facts").hidden = true;
    }

    $("step-live").textContent = "Your booking is confirmed. You will receive a Zoom link and the passcode 4 hours before the session.";
    scrollToBook();
  }

  function watchAge() {
    const age = Number($("age").value);
    $("guardian-note").hidden = !(Number.isInteger(age) && age < 18);
  }

  function init() {
    if (!cfg) {
      $("details-error").hidden = false;
      $("details-error").textContent = "The booking settings could not be loaded.";
      return;
    }

    applyStaticText();
    renderSoon();

    if (new URLSearchParams(window.location.search).get("booked") === "1") {
      showDone();
    }

    $("details-form").addEventListener("submit", showDetails);
    $("pay-form").addEventListener("submit", submitBooking);
    $("age").addEventListener("input", watchAge);
    $("edit-details").addEventListener("click", () => {
      $("step-pay").hidden = true;
      $("step-details").hidden = false;
      $("name").focus();
    });

    $("day-grid").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-iso]");
      if (!button) return;
      selectDay(button.dataset.iso, null);
    });

    $("time-grid").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-time]");
      if (!button) return;
      state.time = button.dataset.time;
      document.querySelectorAll("#time-grid .time").forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      updateChoice();
      payError("");
    });

    $("more-days").addEventListener("click", () => {
      state.showAllDays = true;
      renderDays();
    });

    $("confirm-pop-ok").addEventListener("click", () => {
      const pop = $("confirm-pop");
      if (pop.open) pop.close();
    });

    $("book-another").addEventListener("click", () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // Ignore storage failures and still leave the confirmation page.
      }
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "book";
      window.location.href = url.toString();
    });

    window.addEventListener("pageshow", () => {
      state.submitting = false;
      const button = $("pay-btn");
      if (button) {
        button.disabled = false;
        button.textContent = "I have paid";
      }
    });
  }

  init();
})();
