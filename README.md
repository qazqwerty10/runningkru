# Couch to 10 Miles

Shared training app for the May 15, 2027 10-mile race. It's a plain website hosted free on GitHub Pages. Everyone's plans and workouts save to a Google Sheet you own. Nobody needs an account; each person picks their name the first time they open the app.

## Files

| File | What it is |
|---|---|
| `index.html`, `app.js` | The app |
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

1. Create a new Google Sheet at sheets.new and name it **Couch to 10 Miles – Crew**.
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
7. Wait a minute, then reload the site. The top line should say **Synced** with a green dot.

## 3. Get the crew on it

- Open the link on your phone and join. Then text the link to everyone else.
- First visit: tap **I'm new: join the crew**. On any later device, tap your own name.
- On iPhone: Share → **Add to Home Screen**. On Android: menu → **Add to Home screen**. It then opens like an app.

## Good to know

- **Privacy:** anyone with the link can see the crew and could log as anyone. Don't post the link publicly. The Sheet itself stays private to your Google account.
- **The Sheet:** the *Runners* tab holds the app's data (don't edit column D). The *Workouts* tab is a readable list of every logged session.
- **Changing `Code.gs` later:** use **Deploy → Manage deployments → Edit → Version: New version**. That keeps the same URL. A *New deployment* creates a new URL that you'd have to paste into `config.js` again.
- **Same person on two phones at once:** the last save wins. Log from one device per workout and you'll be fine.
- **Offline:** changes stay on the phone and retry every 15 seconds until they reach the Sheet.
