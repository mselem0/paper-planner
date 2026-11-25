# Usage stats backend (Google Sheets)

The planner can send one tiny note per day to a Google Apps Script you own. It contains an anonymous device id, the day, whether the app is installed, platform, language, and the person's name only if they allow it. Never tasks, budget or notes. Without a URL the feature is fully off.

1. Create a new Google Sheet (any name).
2. Open **Extensions > Apps Script** from inside that Sheet, delete the sample code and paste the contents of `stats/apps-script.gs`. Save.
   - If you created the script at script.google.com instead (not from the Sheet), it is not linked to the Sheet. Set `SHEET_ID` at the top of the file to the ID in the Sheet's URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.
3. Select **testPing** in the function menu and click **Run**. Authorize when asked (**Advanced > Go to … > Allow**). The Sheet should get `Summary`, `Users` and `Daily` tabs with a "Test User" row. Delete that row.
4. Click **Deploy > New deployment**, choose type **Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**, then **Deploy**.
6. Copy the **Web app URL** (ends in `/exec`).
7. For GitHub Pages: repo **Settings > Secrets and variables > Actions > Variables**, add a variable named `VITE_STATS_URL` with that URL, then re-run the deploy workflow.
8. For local testing: put `VITE_STATS_URL=<url>` in `.env.local` (see `.env.example`) and restart `npm run dev`.

If you change the script later, use **Deploy > Manage deployments > Edit > Version: New version > Deploy** so the URL stays the same. A new deployment gets a new URL.

## Troubleshooting
- **The Sheet stays empty.** POST a test ping and read the reply. `ok` means it was recorded. An HTML error page means the script failed; its title holds the message, for example `Cannot read properties of null (reading 'getSheetByName')`, which means the script is not bound to the Sheet (set `SHEET_ID`).
- **You edited the script but nothing changed.** The deployment still runs the old version. Publish a new version as described above.
