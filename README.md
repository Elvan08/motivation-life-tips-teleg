This repo contains a Telegram bot (grammY) that delivers motivational messages and practical life tips.

Features
1) Personalized categories (multi-select)
2) /motivate and /tip generation via CookMyBots AI Gateway
3) Mood selection (/mood) to adjust tone
4) Favorites (save/remove + pagination)
5) History (last 10 delivered items)
6) Optional daily reminders (single-process polling loop)
7) Admin diagnostics (/admin_status)

Architecture
1) src/index.js boots config, starts the bot via long polling, and starts the reminders loop.
2) src/bot.js wires commands first, then the agent features (no catch-all chat).
3) src/commands/* contains public commands.
4) src/features/* contains callback handlers and reminders loop.
5) src/lib/* contains config, DB, AI gateway client, logging helpers.

Setup
1) Install
   npm run install:root

2) Configure env
   Copy .env.sample to .env and fill in values.

Required
- TELEGRAM_BOT_TOKEN

Required for AI generation
- COOKMYBOTS_AI_ENDPOINT (base URL, example: https://api.cookmybots.com/api/ai)
- COOKMYBOTS_AI_KEY

Optional but recommended (enables preferences, reminders, favorites, history)
- MONGODB_URI

Optional admin
- BOT_ADMINS (comma-separated Telegram user IDs)

Run
1) Dev
   npm run dev

2) Prod
   npm run build
   npm start

Commands
1) /start
   Starts onboarding: pick categories, then optionally configure reminders.

2) /help
   Shows command list and examples.

3) /motivate
   Generates a short motivational message tailored to your categories and mood. Includes buttons Save, Another, Change categories.

4) /tip
   Generates a practical tip with 2–4 steps tailored to your categories. Includes buttons Save, Another, Change categories.

5) /mood
   Pick your current mood via buttons; bot stores it and responds in that tone.

6) /categories
   View and toggle category preferences.

7) /remind
   Configure reminders: time (HH:MM), timezone (IANA, defaults to UTC), and reminder type (Motivation/Tip/Mixed).

8) /remind_off
   Disable reminders.

9) /save
   Saves the last delivered item.

10) /favorites
   Lists saved items with pagination and Remove buttons.

11) /remove_favorite
   Guides you to remove items via /favorites.

12) /history
   Shows your last 10 delivered items.

13) /reset
   Clears stored conversation memory (only affects AI context). Preferences/favorites/history remain.

14) /admin_status (admin-only)
   Shows uptime, DB status, reminders enabled count, last reminder loop run time, and env presence booleans.

Reminders
- Implemented as a single-process loop running every 60 seconds.
- For each reminders-enabled user, it checks their local time (timezone) and sends at the scheduled minute.
- Uses lastReminderSentAt to ensure it only sends once per day.

Privacy
If MongoDB is enabled, the bot stores:
1) Your Telegram user ID
2) Selected categories
3) Reminder settings (time/timezone/type)
4) Favorites and history items (text)
5) Latest mood and timestamp

If MongoDB is not configured, the bot runs in stateless mode and disables reminders, favorites, and history.

Troubleshooting
1) Bot won’t start
- Ensure TELEGRAM_BOT_TOKEN is set.

2) AI replies fail
- Ensure COOKMYBOTS_AI_ENDPOINT and COOKMYBOTS_AI_KEY are set.

3) Reminders don’t fire
- Ensure MONGODB_URI is set and /remind has been configured.
- Check logs for reminder loop cycles and any send failures.
