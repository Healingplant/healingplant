# Healingplant

Online counselling site. People enter their details, choose a day and time, pay with the UPI QR, and confirm. The site then emails the client and `healingplant123@gmail.com`.

GitHub Pages hosts the pages for free. It cannot send email by itself, so the booking form uses [FormSubmit](https://formsubmit.co), which is free and works from a static site.

## Before you share the link

1. Open `config.js`.
2. Set `sessionFeeInr` to your real fee. It is `99`. `pay-qr.png` already selects Rs 99 when scanned. If you change the fee, the QR image has to be regenerated with that amount.
3. Change `slots` or `openWeekdays` if you want different hours. Times are India Standard Time, Monday to Saturday. A time is hidden once it is under 4 hours away.

The QR pays **Aahil Khan** and does not show the UPI ID on the page. `QR.png` is the original image. The site uses `pay-qr.png`.

## Put it on GitHub Pages

1. On GitHub, create a **public** repository. Free Pages needs a public repository. Leave “Add a README” unchecked.
2. Upload every file in this folder to the repository root, including `index.html`, `QR.png`, `config.js`, `app.js`, and `styles.css`.
3. Open **Settings → Pages → Build and deployment**.
4. Choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
5. Wait for the green link. It looks like `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

You can also upload with Git:

```powershell
cd "C:\Users\I076838\OneDrive - SAP SE\Saleha\GrowingMinds"
git init
git add .
git commit -m "Add Healingplant booking site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Turn the emails on (one time)

1. Open the **live** GitHub Pages link. Do not test by double-clicking `index.html`. A file on your computer cannot send the emails.
2. Check `healingplant123@gmail.com` for a message from FormSubmit titled something like “Activate Form”.
3. Click the activation link in that email.
4. Make one test booking with your own email address. Pay nothing for the test, but type a fake reference such as `TEST123456` so you can see the full email.
5. You should receive the booking at `healingplant123@gmail.com`. The same email is copied to the address typed in the form. The subject is “Your Healingplant booking is confirmed”, and it says a Zoom link and passcode will arrive 4 hours before the session.

Until that activation link is clicked, real bookings will not arrive. The first submission only asks you to activate.

Pressing **I have paid** sends the email immediately and keeps the person on the confirmation page. Ask them to check spam if it is not in the inbox.

Choosing a day and a time also emails a calendar blocker to `healplant123@gmail.com`. The message has a calendar file and a link that adds the session to Google Calendar for 50 minutes. That inbox needs its own FormSubmit activation the first time.

## Slot tracker

Taken times are stored in a private Google Sheet named **Healingplant bookings**. The page asks that sheet which times are blocked or paid, and those times are left off the list for everyone else. The sheet also keeps the person's name, phone, email, and UPI reference. Visitors cannot open the sheet.

1. Open https://script.google.com while signed in to the Google account that should own the sheet.
2. Create a project, replace the sample code with the contents of `sheet-tracker.gs`, and save.
3. Choose **Deploy → New deployment → Web app**. Execute as **Me**. Who has access: **Anyone**.
4. Copy the web app URL into `sheetUrl` in `config.js`.
5. Open the web app URL once, then look in Google Drive for **Healingplant bookings**.
6. Upload `config.js` and `app.js` to GitHub again.

Until `sheetUrl` is filled in, the page cannot tell which times another person has taken. If you change the times in `config.js`, change `SLOTS` in `sheet-tracker.gs` to the same list and deploy the script again.

## After a real booking

This page cannot see inside Google Pay. It sends the emails when the person says they have paid and enters their UPI reference.

Before you send the Zoom link, match that reference in your UPI app. About 4 hours before the session, email them the Zoom link and the passcode. The site does not create the Zoom meeting.

## Preview on your computer

```powershell
cd "C:\Users\I076838\OneDrive - SAP SE\Saleha\GrowingMinds"
python -m http.server 5500
```

Open `http://localhost:5500`. You can click through the form. Send the real test only from the GitHub Pages link after activation.
