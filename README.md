# Flock Hub

A Progressive Web App for a Catholic CCD program. Kids play a customizable sheep with a random name, walk around a village map (joystick on phones), track Mass attendance, pray, play a Lost Sheep minigame, read homework and messages on the Notice Board, and collect items. Church admins manage students, homework, messages, Mass times and the parent list. Parents get a weekly progress email.

**Stack:** Vite, Phaser 3, Firebase (email-link sign-in + Firestore), Vercel (hosting, serverless functions, cron), Resend (email).

## Project layout

```
index.html               kids' app page (joystick, popup panels)
admin.html               church admin dashboard page
src/main.js              village map, Pasture minigame, panels, joystick
src/admin.js             admin: students, homework & messages, parent list, Mass times
src/firebase.js          Firebase setup, parent sign-in, invites, saves
api/weekly-digest.js     weekly parent emails (called by Vercel Cron)
api/unsubscribe.js       unsubscribe link target
public/assets/*.png      ALL game art (see "Changing the images")
public/assets/gear/*.png  sheep clothing overlays (hats, neck, extras)
public/assets/ui/*.png   small icons used instead of emoji (sheep, church, mail, ...)
public/*.png             app icons and favicon
firestore.rules          security rules to paste into Firebase
vercel.json              /admin shortcut, weekly cron schedule, function settings
tools/make-assets.py     optional script that regenerates the placeholder art
.env.example             list of variables
```

## Part A: Accounts and tools you need

1. **Node.js 18 or newer** (https://nodejs.org). Check with `node -v`.
2. **Git** (check with `git --version`) and a free **GitHub** account.
3. A free **Vercel** account (sign up with GitHub).
4. A Google account for **Firebase** (free Spark plan is enough).
5. A free **Resend** account (https://resend.com) and a **domain you own** (needed to email parents).

## Part B: Firebase setup

1. https://console.firebase.google.com > **Create a project** (name it `flock-hub`; Analytics optional).
2. On the project home click the **web icon `</>`**, nickname it `flock-hub-web`, leave Hosting unchecked, **Register app**. Keep the `firebaseConfig` block open; you need its six values.
3. **Build > Authentication > Get started > Sign-in method > Email/Password**: turn the first **Enable** on **and also "Email link (passwordless sign-in)"**, then **Save**.
4. **Build > Firestore Database > Create database**: pick a region near you, **production mode**, **Create**.
5. Firestore **Rules** tab: replace everything with the contents of `firestore.rules` from this project, then **Publish**. (Do this again any time the file changes.)
6. **Project settings** (gear) > **Service accounts** > **Generate new private key**. Save the JSON file somewhere safe. It is only for Vercel (Part E). Never commit it or share it.

## Part C: Run it on your computer

```bash
cd sheep-hub
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Open `.env` and fill in the six `VITE_` values (no quotes, no spaces):

| .env name | firebaseConfig value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Create your test church in **Firestore Database > Data** (use your own email in **all lowercase** as the Document ID):

1. Collection `admins`, Document ID `you@example.com`, field `churchId` (string) = `test-church`.
2. Collection `invites`, Document ID `you@example.com`, fields `churchId` (string) = `test-church` and `classId` (string) = `class-a`.

Then run `npm run dev` and open the address it prints (usually http://localhost:5173). Enter your email, check the consent box, tap the link in your inbox, and tap **New sheep**. The top-left should say "cloud save". The admin page is http://localhost:5173/admin.html.

Without Firebase keys the app still runs and saves on that device only ("local save").

## Part D: Upload to GitHub

1. https://github.com > **New repository** > name `flock-hub`, keep it empty, **Create repository**.
2. In the project folder (replace `YOUR-USERNAME`):

```bash
git init
git add .
git commit -m "First version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/flock-hub.git
git push -u origin main
```

Check on GitHub that `.env` and the service account JSON are **not** in the file list.

## Part E: Deploy on Vercel (with environment variables)

1. https://vercel.com > **Add New > Project** > import `flock-hub`.
2. **Framework Preset: Vite**, **Build Command: `npm run build`**, **Output Directory: `dist`** (usually auto-filled). Leave Root Directory as is.
3. Open **Environment Variables** and add all 11 below, one at a time. Keep Production, Preview and Development checked.

| Name | Value | Where to get it |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` | Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` | Firebase web app config |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` | Firebase web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` | Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | Firebase web app config |
| `VITE_FIREBASE_APP_ID` | `appId` | Firebase web app config |
| `FIREBASE_SERVICE_ACCOUNT` | the **entire contents** of the service account JSON file, pasted as-is | Part B step 6 |
| `RESEND_API_KEY` | your Resend API key | Resend > API Keys > Create |
| `MAIL_FROM` | e.g. `Flock Hub <hello@yourdomain.org>` | must use a domain verified in Resend |
| `CRON_SECRET` | a long random string you make up (32+ characters) | any password generator |
| `APP_URL` | e.g. `https://flock-hub.vercel.app` (no trailing slash) | fill in after the first deploy (below) |

4. Click **Deploy**. Vercel gives you a URL like `https://flock-hub.vercel.app`.
5. Go to **Settings > Environment Variables**, set `APP_URL` to that URL (add it if you skipped it), then **Deployments > latest > ... > Redeploy**.

**Resend domain:** in Resend open **Domains > Add Domain**, add the DNS records it shows at your domain provider, and wait until it says **Verified**.

**Important:** the `VITE_` values are baked in at build time and the server values are read at run time, so **after changing any variable, redeploy**. Weekly cron jobs only run on the production deployment.

## Part F: After the first deploy

1. **Firebase > Authentication > Settings > Authorized domains > Add domain**: add your Vercel domain (and any custom domain). Sign-in links will not work without this.
2. Add your Vercel domain's invite/admin test data (Part C already created it; Firestore is shared).
3. Open `https://YOUR-SITE.vercel.app` on your phone, sign in, and play. Open `https://YOUR-SITE.vercel.app/admin` and sign in as the admin.
4. **Install it like an app:** iPhone Safari > Share > **Add to Home Screen**. Android Chrome > menu > **Install app**.
5. **Test the weekly email without sending:**
   `curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR-SITE.vercel.app/api/weekly-digest?dry=1"`
   It lists who would get an email and previews the first one. Run it without `?dry=1` to send for real (try your test church first).

## Part G: Setting up a real church

1. In Firestore add an `admins` document for each church admin: Document ID = their lowercase email, field `churchId` (string), for example `st-anne`.
2. The admin opens `/admin`, signs in with the emailed link, and uses the tabs:
   - **Parent list:** paste lines like `maria@example.com, grade-4-mon` to let parents register.
   - **Mass times:** add each Mass and **Save**.
   - **Homework & messages:** post to one class or everyone.
   - **Students:** each child's sheep (shown wearing their chosen color and gear), random name, class, parent email, and progress.
3. Parents open the site, enter their invited email, agree to progress emails, tap the link, and pick or add their child's sheep (up to 6 children each). Progress follows them to any device.

## Launch checklist

- [ ] Firebase project created, web app registered, Email/Password and Email link enabled
- [ ] Firestore created and `firestore.rules` published
- [ ] Service account key downloaded (not in GitHub)
- [ ] Resend account, domain verified, API key created
- [ ] `.env` filled in and `npm run dev` works with "cloud save"
- [ ] Code pushed to GitHub (no `.env` or JSON key in the repo)
- [ ] All 11 variables added in Vercel and project deployed
- [ ] `APP_URL` set to the real site URL and redeployed
- [ ] Vercel domain added to Firebase **Authorized domains**
- [ ] Test church: admin doc, invite doc, signed in as admin and as parent
- [ ] Posted a test homework and a test Mass time; saw them in the app
- [ ] `?dry=1` digest test looks right, then one real email received
- [ ] Added to a phone's home screen and tested the joystick
- [ ] Reviewed your diocese's rules and COPPA (children under 13) with your parish
- [ ] Real churches' admin docs added and parent lists uploaded

## Changing the images

All art is PNG, so you can swap any file in the repo, commit, and push; Vercel redeploys automatically. Keep the **same file name**. Sizes are recommendations; the game draws each image at its own size.

| File | Size | Notes |
|---|---|---|
| `public/assets/sheep.png` | 48x48 | The sheep sits in the middle 32x32 (8px empty margin on every side so gear can stick out). Draw the **wool white or light grey** and the face dark. The wool-color picker tints this image. Faces right (flipped when walking left). |
| `public/assets/lamb.png` | 20x20 | Lost lambs in the Pasture. |
| `public/assets/grass.png`, `path.png` | 32x32 | Seamless tiles repeated over the map. |
| `public/assets/church.png`, `pasture.png`, `chapel.png`, `gallery.png`, `board.png`, `wardrobe.png`, `garden.png` | 128x128 | Village buildings on a transparent background, centered. |
| `public/assets/items/halo.png`, `rosary.png`, `medal.png`, `homework.png`, `beads.png` | 64x64 | Collectible icons shown in the Gallery. |
| `public/assets/bead.png`, `bead-big.png`, `stone.png` | 32x32 | Rosary Run beads (drawn at 2x and 2.5x) and the stones to steer around. |
| `public/assets/gear/*.png`: `straw-hat`, `flower-crown`, `halo`, `mitre`, `scarf`, `bell`, `rosary`, `medal`, `staff`, `wings` | 48x48 | Transparent overlays on the same 48x48 canvas as `sheep.png`, facing right, so they line up exactly. The 8px margin lets hats, wings and staffs stick out past the sheep. `staff` and `wings` are drawn behind the sheep's body; hats and neck items in front. |
| `public/assets/ui/*.png`: `sheep`, `church`, `chapel`, `gallery`, `board`, `homework`, `mail`, `done`, `cloud`, `disk`, `plus`, `back`, `wardrobe`, `garden` | 32x32 | Small icons used in headings, buttons, the top bar, the admin page, and the weekly email. The app uses no emoji or icon fonts; every symbol is one of these PNGs. |
| `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180), `favicon.png` (32) | as named | App icon and favicon. |

To add a **new collectible**: put its PNG in `public/assets/items/` and add a line to `ITEMS` at the top of `src/main.js`.

The game uses pixel-art rendering (crisp, not blurry). After replacing images, hard-refresh the browser (or reopen the installed app) because the app caches files. The placeholder art can be regenerated with `python3 tools/make-assets.py` (needs `pip install pillow`).

## Rosary Run

Kids walk to the **Rosary Run** garden on the east side of the village. They run up a long path, steering around stones, to touch 12 beads in order: an Our Father, ten Hail Marys, and a Glory Be. Only the next bead glows. Each bead shows its prayer line at the top, so kids read the prayer as they go (the Hail Mary lines repeat across the ten beads). Finishing a decade counts as a prayer (it adds to the same count as the Chapel, which unlocks the Angel Wings), and earns the **Golden Beads** collectible.

To change the prayer text, edit `HAIL`, `BEAD_NAMES` and `BEAD_LINES` at the top of `src/main.js`.

## Customizing the sheep

Kids visit the **Wardrobe** (south end of the village) to pick a **wool color** (8 colors) and gear for three slots: **hat**, **neck**, and **extra**. A live preview shows the sheep, and the choice shows up on the sheep everywhere in the game and is saved with the child's progress. Names stay random and cannot be edited, to protect privacy. The sheep and its gear are drawn at 2x size in the game (`SHEEP_SCALE` in `src/main.js`) and the wool colors are bold, so every choice is easy to see.

Some gear is free; some unlocks by playing:

| Gear | Unlock |
|---|---|
| Straw Hat, Flower Crown, Scarf, Bell | free |
| Halo | go to Mass once (Halo collectible) |
| Mitre | attend 5 Masses |
| Rosary | say a prayer in the Chapel |
| Medal | find the lost sheep in the Pasture |
| Shepherd Staff | finish a homework (Homework Hero) |
| Angel Wings | say 10 prayers |

**Add new gear (3 steps):**
1. Draw a 48x48 transparent PNG on top of `public/assets/sheep.png` (so it lines up) and save it as `public/assets/gear/my-gear.png`.
2. Add one line to the `GEAR` list at the top of `src/main.js`, for example:
   `{ id: 'my-gear', slot: 'hat', label: 'My Gear', unlock: { lambs: 10, hint: 'Find 10 lost sheep' } }`
   (`slot` is `hat`, `neck`, or `extra`; leave out `unlock` to make it free. Unlock types: `item`, `masses`, `prayers`, `lambs`.)
3. Commit and push. To add wool colors, add hex values to `COLORS` in `src/main.js`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| HUD says "local save" on Vercel | The six `VITE_` variables are missing or misspelled. Fix and redeploy. |
| `auth/operation-not-allowed` | Email link sign-in is not enabled (Part B step 3). |
| `auth/unauthorized-continue-uri` or `unauthorized-domain` | Add your domain in Part F step 1. |
| `permission-denied` | Republish `firestore.rules`; check `churchId` values match across `admins` and `invites`. |
| "This email is not on your church's list" | The invite document is missing, or its Document ID is not the exact lowercase email. |
| Admin page says "not an admin" | The `admins` document is missing, or its Document ID is not the exact lowercase email. |
| Sign-in email does not arrive | Check spam. Firebase's built-in sender has daily limits; for many families set up a custom SMTP sender in Firebase later. |
| Digest says `Unauthorized` | `CRON_SECRET` in your curl command does not match Vercel, or you have not redeployed. |
| Digest returns a Resend error | `MAIL_FROM` must use a domain verified in Resend, and the API key must be correct. |
| Old art still showing | Hard-refresh; the service worker caches files. |
| Blank page after deploy | Check the Vercel build log; run `npm run build` locally to reproduce. |

## Privacy notes

- Kids only have random sheep names; real names and photos are never collected. The only personal data is the parent's email (sign-in and, with consent, progress emails).
- Only a child's parent can read that child's save. Church admins see only their own church's students, parent list, posts and Mass times.
- Progress emails go only to parents who checked the consent box, show only random sheep names, and include an unsubscribe link. Opted-out parents stay opted out until `updates` is set back to `true` on their children in Firestore.
- The Firebase web config is not a secret; security comes from the Firestore rules. The service account key and other server variables live only in Vercel's environment variables.
- For children under 13 in the US, review COPPA requirements and your diocese's policy.

## Next steps

More minigames (Rosary Run, saint quests), liturgical-season maps, a parent opt-in toggle, and weekly (not just total) progress numbers in the email.
