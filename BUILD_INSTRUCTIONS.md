# MoneyTracker APK Build Instructions

Follow these steps on your PC to get your APK in ~10 minutes.

---

## STEP 1 — Install Node.js
Download from: https://nodejs.org (choose LTS version)

---

## STEP 2 — Extract this zip
Unzip `MoneyTracker.zip` to a folder, e.g. Desktop/MoneyTracker

---

## STEP 3 — Open Terminal / Command Prompt
On Windows: Press Win+R → type `cmd` → Enter
On Mac: Open Terminal app

Navigate to the folder:
```
cd Desktop/MoneyTracker
```

---

## STEP 4 — Install dependencies
```
npm install --legacy-peer-deps
```

---

## STEP 5 — Create a FREE Expo account
Go to: https://expo.dev/signup
Remember your username and password.

---

## STEP 6 — Install EAS CLI
```
npm install -g eas-cli
```

---

## STEP 7 — Log in to Expo
```
eas login
```
Enter your Expo email and password.

---

## STEP 8 — Link your project
```
eas init
```
When asked "Would you like to use an existing project?" — choose No.
Give it the name: MoneyTracker

---

## STEP 9 — Build the APK ⬇️
```
eas build -p android --profile preview
```

- It will ask about push notifications — press Enter to skip.
- The build happens in the cloud (free). It takes about 5–10 minutes.
- When done, it shows a download link for your APK!

---

## STEP 10 — Install on your phone
1. Download the APK from the link shown.
2. Transfer to your Android phone (via USB, Google Drive, or email).
3. On your phone: Settings → Security → Allow Unknown Sources → ON
4. Open the APK file and install.

---

## Troubleshooting

**"eas: command not found"** → Close terminal, reopen, try again.

**Build fails** → Run `eas diagnostics` and check the error.

**npm install fails** → Make sure you used `--legacy-peer-deps` flag.

---

## Features in your app:
✅ Zero-Based Budgeting
✅ Expense Tracker
✅ Multiple Accounts (BDO, BPI, GCash, etc.)
✅ Net Worth Tracker with date sorting
✅ Loan Tracker with progress
✅ Live Multi-Currency via exchangerate-api.com
✅ All data saved locally on your phone
