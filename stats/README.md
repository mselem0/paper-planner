# Usage stats backend (Google Sheets)

The planner can send one tiny note per day to a Google Apps Script you own. It contains an anonymous device id, the day, whether the app is installed, platform, language, and the person's name only if they allow it. Never tasks, budget or notes. Without a URL the feature is fully off.

1. Create a new Google Sheet (any name).
2. Open **Extensions > Apps Script**, delete the sample code and paste the contents of `stats/apps-script.gs`. Save.
3. Click **Deploy > New deployment**, choose type **Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**, then **Deploy** and authorize when asked.
5. Copy the **Web app URL** (ends in `/exec`).
6. For GitHub Pages: repo **Settings > Secrets and variables > Actions > Variables**, add a variable named `VITE_STATS_URL` with that URL, then re-run the deploy workflow.
7. For local testing: put `VITE_STATS_URL=<url>` in `.env.local` (see `.env.example`) and restart `npm run dev`.
8. Open the planner once. The sheet gets `Summary`, `Users` and `Daily` tabs on the first ping.

If you change the script later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.
