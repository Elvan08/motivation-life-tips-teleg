This bot provides motivational messages and practical life tips tailored to a user’s chosen categories, with optional daily reminders.

Setup
1) Install dependencies
Run: npm run install:root

2) Configure environment
Copy .env.sample to .env and set at least TELEGRAM_BOT_TOKEN.

3) Run
Development: npm run dev
Production: npm run build then npm start

Public commands
1) /start
Starts onboarding.
It asks you to pick categories (multi-select) and whether you want daily reminders.

2) /help
Shows available commands and short examples.

3) /motivate
Generates a short motivational message tailored to your selected categories and recent mood (if set).
Buttons: Save, Another, Change categories.

4) /tip
Generates a practical, concise tip tailored to your categories.
It includes 2–4 steps.
Buttons: Save, Another, Change categories.

5) /mood
Lets you select a mood (Great, Okay, Stressed, Sad, Unmotivated, Angry, Anxious).
The bot stores your latest mood and replies with a message in that tone.

6) /categories
Shows your current selected categories and lets you toggle them.

7) /remind
Configures reminders.
Flow: enter time (HH:MM) then timezone (IANA like Europe/London, default UTC), then reminder type (Motivation, Tip, Mixed).

8) /remind_off
Turns off reminders.

9) /save
Saves the last delivered motivation/tip item.

10) /favorites
Lists your saved items with pagination.
Each item has a Remove button.

11) /remove_favorite
If invoked as a command, it guides you to use /favorites for removal.

12) /history
Shows your last 10 delivered items with a short snippet and timestamp.

13) /reset
Clears the conversation memory used for AI context (if DB is enabled). It does not change your preferences.

14) /admin_status (admin-only)
Shows diagnostics: uptime, DB connected, reminders enabled count, last reminder loop run time, env presence booleans.
If BOT_ADMINS is not set, the command is disabled.

Environment variables
1) TELEGRAM_BOT_TOKEN (required)
Telegram bot token.

2) COOKMYBOTS_AI_ENDPOINT (required for AI)
Base URL for CookMyBots AI Gateway. Example: https://api.cookmybots.com/api/ai

3) COOKMYBOTS_AI_KEY (required for AI)
API key for the CookMyBots AI Gateway.

4) MONGODB_URI (optional but recommended)
Enables stored preferences, reminders, favorites, and history.
If not set, the bot runs in stateless mode with defaults and disables persistence features.

5) BOT_ADMINS (optional)
Comma-separated Telegram user IDs allowed to run /admin_status.
If missing, admin commands are disabled.

Reminder behavior
The reminder loop runs every 60 seconds in the same process.
It checks each reminders-enabled user’s local time based on their configured timezone.
It sends once per day per scheduled minute using a lastReminderSentAt field to prevent duplicates.

AI safety notes
The bot is supportive and practical.
It avoids moralizing, shame, and absolute claims.
It does not provide medical or legal advice.
If the user expresses potential self-harm or severe crisis, the bot responds with a supportive message encouraging contacting local emergency services or a trusted person.

Troubleshooting
1) TELEGRAM_BOT_TOKEN missing
The bot exits with a clear message. Set it and restart.

2) Mongo not configured
Preferences/reminders/favorites/history are disabled. The bot will tell the user when they try to use those features.

3) AI not configured
/motivate and /tip will explain that AI keys are missing.

4) Conflicting polling instances
If Telegram returns a 409 conflict, the bot backs off and retries automatically.
