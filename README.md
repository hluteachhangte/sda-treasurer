# Bethel Church Treasurer

Responsive React/Vite church finance app for Bethel Seventh-day Adventist Church.

## Features

- Firebase Authentication-ready role model for Administrator, Treasurer, Assistant Treasurer, Auditor, and Pastor or Church Elder.
- Sabbath offering entry with the required 50% Local / 50% Mission allocation rules.
- Expenditure vouchers, mission remittance tracking, monthly reports, quarterly reports, audit workflow, immutable audit log, settings, users, and JSON backups.
- PDF, Excel, CSV, print, and PWA support.
- Demo local data mode when Firebase environment variables are not configured.

## Setup

```bash
npm.cmd install
npm.cmd run dev
```

Open the local URL shown by Vite. Demo logins use password `demo123`:

- `admin@bethelsda.local`
- `treasurer@bethelsda.local`
- `assistant@bethelsda.local`
- `auditor@bethelsda.local`
- `elder@bethelsda.local`

## Firebase Configuration

Copy `.env.example` to `.env` and fill in your Firebase project values.

```bash
copy .env.example .env
```

The app does not store passwords in Firestore. Create real users in Firebase Authentication, then create matching role documents under:

```text
churches/bethel-sda/users/{uid}
```

Use this shape:

```json
{
  "churchId": "bethel-sda",
  "name": "Church Treasurer",
  "email": "treasurer@example.com",
  "role": "Treasurer",
  "active": true
}
```

## Firestore Data Model

```text
churches
  bethel-sda
    profile
    settings
    users
    offeringCategories
    financialYears
      2026
        months
          08
            offerings
            expenditures
            remittances
            audits
            monthlySummary
        quarters
          Q1
          Q2
          Q3
          Q4
    auditLogs
```

Financial formulas are centralized in `src/utils/calculations.js`.

## Cross-device Sync

Phone and desktop sync through Firestore when Firebase config is present. For the GitHub Pages app, add these repository secrets in GitHub under Settings > Secrets and variables > Actions:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

In Firebase Console, enable Authentication > Sign-in method > Anonymous. Then deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

The shared app state is stored at:

```text
churches/bethel-sda/appState/main
```

## Deployment

```bash
npm.cmd run build
firebase deploy
```

Before deploying, review `firestore.rules` and `storage.rules`, then publish them to the intended Firebase project.
