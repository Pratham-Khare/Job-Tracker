# JobTrack V10 — Gmail + Tracking + Templates

## Current features
- Real Gmail sending through the user's Gmail account.
- Open tracking and per-link click tracking.
- Rich email templates with bold/italic/underline and links embedded in selected words.
- Multiple reusable templates.
- Excel import creates drafts only; it never sends automatically.
- Follow-up behavior is opt-in:
  - Automatic follow-up is OFF by default.
  - If enabled, it is scheduled only after the initial email is opened at least once.
  - The user chooses the delay, subject, and exact follow-up body.
  - A detected Gmail reply clears the pending follow-up, so it is not sent.
  - Manual follow-up remains available from Email activity.
- Account deletion removes the JobTrack account and associated application, company, job, contact, call, email, tracking, template, notification, and stored Gmail connection data.

## Local run
Backend:
```cmd
cd server
npm install
npm run dev
```
Frontend:
```cmd
cd client
npm install
npm run dev
```
