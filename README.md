# Flock Hub

A Progressive Web App for a Catholic CCD program. Kids play a customizable sheep with a randomly generated name (no real names collected), walk around a village map with a joystick, track Mass attendance, pray, play a Lost Sheep minigame, and earn collectibles. Parents sign in with the email their church has on file; each child has a random-name sheep, and progress saves to Firebase so it follows them to any device.

**Stack:** Vite, Phaser 3, Firebase (email-link sign-in for parents + Firestore), hosted on Vercel.

## What you need first

- A computer with **Node.js 18 or newer** (check with `node -v`; download from https://nodejs.org)
- **Git** (check with `git --version`)
- A free **GitHub** account, a free **Vercel** account, and a Google account for **Firebase**

## 1. Run it on your computer

```bash
cd sheep-hub
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). Without Firebase set up the app still works and saves on that device only; the top-left shows "local save". Once Firebase is connected it shows "cloud save".

## 2. Create the Firebase project

1. Go to https://console.firebase.google.com and click **Create a project**. Name it (for example `flock-hub`). Google Analytics is optional; you can turn it off.
2. On the project home page click the **web icon `</>`** ("Add app"). Nickname it `flock-hub-web`. Leave "Firebase Hosting" unchecked. Click **Register app**.
3. Firebase shows a `firebaseConfig` block. Keep this tab open; you need these six values: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Left menu, **Build > Authentication > Get started > Sign-in method > Email/Password**. Turn the first **Enable** switch on **and also turn on "Email link (passwordless sign-in)"**, then **Save**.
5. Left menu, **Build > Firestore Database > Create database**. Choose a region near you, start in **production mode**, and click **Create**.
6. In Firestore open the **Rules** tab, replace everything with the contents of `firestore.rules` from this project, and click **Publish**. This lets each kid read and write only their own save.

## 3. Add your keys locally

1. Copy `.env.example` to a new file named `.env` in the project root:
   - Mac/Linux: `cp .env.example .env`
   - Windows: `copy .env.example .env`
2. Paste each value after the `=`, with no quotes or spaces:

| .env name | firebaseConfig value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

3. Stop and restart `npm run dev`. First add your own email as an invite (see "Adding a church's parent list" below). Then open the app, enter that email, tap the link in your inbox, and tap **New sheep**. The HUD should now say "cloud save". Play a bit, then check **Firestore Database > Data**: a `players` collection with one document appears.

`.env` is listed in `.gitignore`, so it will not be uploaded to GitHub.

## 4. Upload to GitHub

1. On https://github.com click **New repository**, name it `flock-hub`, keep it empty (no README or .gitignore), and click **Create repository**.
2. In the project folder run (replace `YOUR-USERNAME`):

```bash
git init
git add .
git commit -m "First version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/flock-hub.git
git push -u origin main
```

Check on GitHub that `.env` is **not** in the file list.

## 5. Deploy on Vercel

1. Go to https://vercel.com, sign in with GitHub, and click **Add New > Project**.
2. Import the `flock-hub` repository.
3. Settings: **Framework Preset: Vite**, **Build Command: `npm run build`**, **Output Directory: `dist`** (these are usually filled in automatically).
4. Open **Environment Variables** and add all six names from the table above, one at a time, with the same values as your `.env`. Leave Production, Preview, and Development all checked.
5. Click **Deploy**. When it finishes, Vercel gives you a URL like `https://flock-hub.vercel.app`.

**If you change an environment variable later:** Vercel > your project > **Deployments** > the latest one > **...** > **Redeploy**. Vite reads variables at build time, so a redeploy is required.

## 6. Final Firebase step (required for email links)

In Firebase go to **Authentication > Settings > Authorized domains > Add domain** and add your Vercel domain (for example `flock-hub.vercel.app`, plus a custom domain if you add one).

## 7. Install it like an app

- **iPhone (Safari):** Share button > **Add to Home Screen**
- **Android (Chrome):** menu > **Install app** or **Add to Home screen**

## Adding a church's parent list

Each church gets an invite list in Firestore. A parent can only register if their email is on it, and their kids are then linked to that church.

For each parent, in Firebase go to **Firestore Database > Data**:
1. Click **Start collection**, name it `invites` (first time only).
2. **Document ID:** the parent's email in **all lowercase**, for example `maria.lopez@gmail.com`.
3. Add two fields, both type `string`: `churchId` (for example `st-anne`) and `classId` (for example `grade-4-mon`).
4. Save. Repeat for each parent. (Or use the admin dashboard's **Parent list** tab, described below.)

## Church admin dashboard (homework and messages)

Admins use a separate page: `https://YOUR-SITE.vercel.app/admin` (locally `http://localhost:5173/admin.html`).

**Make someone an admin** (you do this once per admin, in Firebase **Firestore Database > Data**):
1. Start a collection named `admins` (first time only).
2. **Document ID:** the admin's email in all lowercase.
3. Add one field, type `string`: `churchId`, using the same value you use in that church's `invites` (for example `st-anne`).

**Republish `firestore.rules`** (Firestore > Rules) because the admin features need the latest rules (they now include Mass times, stored in a `churches` collection).

The admin signs in with an emailed link, then has four tabs:
- **Students:** each child's random sheep name, class, parent email, Masses attended, prayers, lambs found, and homework done out of assigned.
- **Homework & messages:** post homework (with an optional due date) or a message to one class or everyone. Delete old posts anytime.
- **Parent list:** paste `email, class` lines to add parents, and remove them.
- **Mass times:** add each Mass (day, time, optional note like "Spanish"), then **Save**. Families see these at the Church building in the village.

Kids see posts on the **Notice Board** in the village, and tap **I did it** on homework to earn the Homework Hero collectible. An admin only ever sees their own church.

## How parents and kids sign in

1. The parent enters the invited email and checks the guardian consent box. They get a one-time sign-in link by email.
2. After tapping the link they pick a child or tap **New sheep**. Each sheep gets a random name. Up to 6 children per parent.
3. On any other device the parent repeats step 1, picks the child, and progress loads from Firebase.
4. **Switch child** in the Gallery returns to the "Who is playing?" screen.

## Weekly parent emails

Every Sunday at 14:00 UTC (edit the schedule in `vercel.json`), a Vercel Cron job emails each parent who agreed to updates: Masses this week and total, prayers, lost sheep found, homework done out of assigned, and what is still to do. Every email has an unsubscribe link. Kids created before parent emails were added are skipped.

**Set it up (once):**
1. **Resend (email sender):** create a free account at https://resend.com. Under **Domains**, add and verify a domain you own (follow the DNS steps; this is required to email anyone besides yourself). Under **API Keys**, create a key.
2. **Firebase service account:** Firebase console > **Project settings** (gear) > **Service accounts** > **Generate new private key**. A JSON file downloads. Never put it in GitHub or share it.
3. **Vercel:** your project > **Settings > Environment Variables**. Add these five (all environments):

| Name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | the whole contents of the JSON file, pasted as-is |
| `RESEND_API_KEY` | the key from Resend |
| `MAIL_FROM` | for example `Flock Hub <hello@yourdomain.org>` (must use your verified domain) |
| `CRON_SECRET` | a long random string (32+ characters) that you make up |
| `APP_URL` | your site, for example `https://flock-hub.vercel.app` (no trailing slash) |

4. **Redeploy** (Deployments > latest > ... > Redeploy). Cron jobs only run on production deployments.
5. **Test without sending:** run `curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR-SITE.vercel.app/api/weekly-digest?dry=1"`. It lists who would get an email and previews the first one.
6. **Send a real test now:** run the same command without `?dry=1`. (Use a test church with just your own email first.)

Notes: the Vercel Hobby plan allows one cron run per day, which is enough for weekly. Opted-out parents stay opted out until you set `updates` back to `true` on their children in Firestore; a parent self-service toggle is a good future step.

## Troubleshooting

| Symptom | Fix |
|---|---|
| HUD says "local save" on Vercel | The six variables are missing or misspelled in Vercel. Fix them and redeploy. |
| Console error `auth/operation-not-allowed` | Email link sign-in is not enabled (step 2.4). |
| Console error `auth/unauthorized-continue-uri` | Add your domain in step 6. |
| "This email is not on your church's list" | The invite document is missing, or its Document ID is not the exact lowercase email. |
| Admin page says "not an admin" | The `admins` document is missing, or its Document ID is not the exact lowercase email. |
| Admin tabs show `permission-denied` | Republish `firestore.rules`, and check `churchId` matches the invites. |
| Digest returns `Unauthorized` | `CRON_SECRET` in the curl command does not match Vercel's value, or you have not redeployed. |
| Digest returns a Resend error | `MAIL_FROM` must use a domain verified in Resend, and the API key must be correct. |
| Link email does not arrive | Check spam. Firebase's built-in sender has daily limits; for many families use a custom SMTP sender later. |
| Console error `permission-denied` | Rules were not published (step 2.6). |
| Console error `auth/unauthorized-domain` | Add your domain in step 6. |
| Blank page after deploy | Check the Vercel build log for errors; run `npm run build` locally to reproduce. |

## Project layout

```
index.html            kids' page, joystick, popup panels
admin.html            church admin dashboard page
src/admin.js          admin dashboard (students, homework, parent list, Mass times)
api/                  Vercel functions: weekly-digest (cron emails), unsubscribe
vercel.json           makes /admin open the dashboard
src/main.js           hub map, Pasture minigame, panels, joystick
src/firebase.js       Firebase setup, parent email-link sign-in, invites, saves
public/               PWA manifest, icon, service worker
firestore.rules       security rules to paste into Firebase
.env.example          list of required variables
```

## Privacy notes

- Kids only have random sheep names; their real names and photos are never collected. The only personal data is the parent's email (used for sign-in and, with their consent, progress emails).
- Progress emails go only to parents who checked the consent box, show only random sheep names, and include an unsubscribe link. The service account key lives only in Vercel's environment variables.
- Only that parent can read their children's saves. Church admins will get access to their own church's students in the admin step.
- If you serve children under 13 in the US, review COPPA requirements. Parent-email registration with a consent checkbox is a good start; check with your diocese about their policy.
- The Firebase web config is not a secret. Your security comes from the Firestore rules in step 2.6.

## Next steps

1. More minigames, liturgical-season maps, and real tilemap and sprite art.
