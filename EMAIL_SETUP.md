# Email setup (for OTP and notifications)

To send verification OTPs and other emails, add these to your `backend/.env`:

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Learning LMS <noreply@example.com>
```

- **Gmail**: Use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.  
  - `EMAIL_HOST=smtp.gmail.com`
  - If **port 587** gives `ETIMEDOUT` (e.g. on some Wi‑Fi or corporate networks), use **port 465** instead:  
    `EMAIL_PORT=465`
  - Your Gmail address + app password for `EMAIL_USER` and `EMAIL_PASS`.
- **Outlook/Office365**: `EMAIL_HOST=smtp.office365.com`, `EMAIL_PORT=587`.
- **Other**: Use your provider’s SMTP host and port.

If these are not set, OTP emails are not sent. In **development**, the server will log the OTP to the console and the app may show the code on the verify screen so you can still test signup.
