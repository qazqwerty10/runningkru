# RunningKru

Train together. Run your race. Shared training app; the current goal is the Colfax Urban 10 Miler on Sunday, May 16, 2027. It's a plain website hosted free on GitHub Pages. Everyone's plans and workouts save to a Google Sheet you own. Nobody needs an account. Each person joins once on their phone, and that phone gets a private key so nobody else can log as them.

## Files

| File | What it is |
|---|---|
| `index.html`, `app.js` | The app |
| `sw.js` | Lets the app open without internet (saves a copy of the app files on each phone) |
| `config.js` | The one line that points the app at your Google Sheet |
| `Code.gs` | The Google Sheet script (pasted into Google, not used by GitHub) |
| `icon.svg`, `icon-180.png`, `manifest.webmanifest` | Home-screen icon |

## 1. Put the site on GitHub (5 min)

1. Sign in at github.com and click **+ → New repository**. Name it `couch-to-10`, set it to **Public** (free Pages hosting needs that), and click **Create repository**.
2. On the empty repo page, click **uploading an existing file**. Drag in every file from this folder **except `Code.gs`**, then click **Commit changes**.
3. Go to **Settings → Pages**. Under *Branch*, choose `main` and `/ (root)`, then click **Save**.
4. After a minute, your link appears at the top of that page: `https://YOUR-USERNAME.github.io/couch-to-10/`.

At this point the app works, but it only saves on each phone.

## 2. Connect the Google Sheet (5 min)

1. Create a new Google Sheet at sheets.new and name it **RunningKru – Kru**.
2. Click **Extensions → Apps Script**. Delete the sample code, paste in all of `Code.gs`, and click the **Save** icon.
3. Click **Deploy → New deployment**. Click the gear icon next to *Select type* and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**. Google asks you to authorize the script. Choose your account; if you see "Google hasn't verified this app," click **Advanced → Go to (project name)**, then **Allow**. You wrote this script, so this is expected.
5. Copy the **Web app URL**. It ends in `/exec`.
6. Back on GitHub, open `config.js`, click the pencil icon, paste the URL between the quotes, and click **Commit changes**:
   ```js
   window.C10_API = "https://script.google.com/macros/s/AKfy.../exec";
   ```
7. Wait a minute, then reload the site. The top line should say **Connected** with a green dot.

## 3. Get the Kru on it

- Open the link on your phone and join. Then text the link to everyone else.
- First visit: tap **I'm new: join the Kru**. On any later device, tap your own name.
- On iPhone: Share → **Add to Home Screen**. On Android: menu → **Add to Home screen**. It then opens like an app.

## Linking a second phone, or a lost phone

- **Second phone or a laptop:** on your first phone, go to **Setup (gear) → Use on another phone**. Open the link on the new device, or type the 16-character code there after tapping your name.
- **Lost or reset phone:** open the Sheet's **Runners** tab and clear that person's cell in column **F** (key fingerprint). The next phone that taps their name takes over the profile. Their plan and logs are kept.

## Updating the Google script

Uploading `Code.gs` to GitHub doesn't change the script Google runs. To update it:
1. In the Sheet, go to **Extensions → Apps Script** and replace all the code with the new `Code.gs`. Save.
2. Go to **Deploy → Manage deployments**, click the pencil, set **Version: New version**, and click **Deploy**. This keeps the same `/exec` URL, so `config.js` doesn't change.

## Changing the goal race

The race lives in one place: `RACE_CFG` near the top of `app.js` (name, date, distance, start, finish, aid stations, time limit, links). Change it there and every date, label, countdown and race week follows. Plans count back from the race week, so update start dates in Setup if the race week moves.

## Good to know

- **Privacy:** anyone with the link can see names, plans, completed workouts and effort ratings. Pain ratings are shown only on the phone of the person who entered them. You, as the Sheet's owner, can see everyone's pain ratings in the Workouts tab, so tell your Kru that.
- **The Sheet:** the *Runners* tab holds the app's data (don't edit column D). The *Workouts* tab is a readable list of every logged session.
- **Changing `Code.gs` later:** use **Deploy → Manage deployments → Edit → Version: New version**. That keeps the same URL. A *New deployment* creates a new URL that you'd have to paste into `config.js` again.
- **Offline:** the app opens without internet, showing the plan as it was last saved on that phone. Workouts you log offline stay on the phone and upload when you're back online.
- **Two phones, one profile:** each edit is merged into the Sheet field by field, so logging on one phone never erases what you changed on the other. If both change the same field, the later save wins.
