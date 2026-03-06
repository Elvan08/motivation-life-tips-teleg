import "dotenv/config";

async function importMaybe(p) {
  try {
    return await import(p);
  } catch (e) {
    const alts = p.endsWith(".js") ? [p.replace(/\.js$/, ".mjs")] : [p + ".js", p + ".mjs"];
    for (const a of alts) {
      try {
        return await import(a);
      } catch {
        // ignore
      }
    }
    throw e;
  }
}

process.on("unhandledRejection", (r) => {
  console.error("UnhandledRejection:", r);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("UncaughtException:", e);
  process.exit(1);
});

async function boot() {
  try {
    const { cfg } = await importMaybe("./lib/config.js");
    const { createBot } = await importMaybe("./bot.js");
    const { registerCommands } = await importMaybe("./commands/loader.js");
    const { startRemindersLoop } = await importMaybe("./features/remindersLoop.js");

    console.log("[boot] start", {
      telegramTokenSet: !!cfg?.TELEGRAM_BOT_TOKEN,
      aiEndpointSet: !!cfg?.COOKMYBOTS_AI_ENDPOINT,
      aiKeySet: !!cfg?.COOKMYBOTS_AI_KEY,
      mongoSet: !!cfg?.MONGODB_URI,
      botAdminsSet: !!cfg?.BOT_ADMINS,
    });

    if (!cfg?.TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is required. Add it to your env and redeploy.");
      process.exit(1);
    }

    const bot = createBot(cfg.TELEGRAM_BOT_TOKEN);

    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
    } catch (e) {
      console.warn("[boot] deleteWebhook failed", { err: e?.message || String(e) });
    }

    try {
      await bot.init();
    } catch (e) {
      console.warn("[boot] bot.init failed", { err: e?.message || String(e) });
    }

    await registerCommands(bot);

    try {
      await bot.api.setMyCommands([
        { command: "start", description: "Welcome & setup" },
        { command: "help", description: "How to use the bot" },
        { command: "motivate", description: "Get a motivational message" },
        { command: "tip", description: "Get a practical life tip" },
        { command: "mood", description: "Set your current mood" },
        { command: "categories", description: "Choose your categories" },
        { command: "remind", description: "Configure daily reminders" },
        { command: "remind_off", description: "Disable reminders" },
        { command: "save", description: "Save the last item" },
        { command: "favorites", description: "List saved items" },
        { command: "history", description: "Show recent items" },
        { command: "reset", description: "Clear AI context memory" },
        { command: "admin_status", description: "Admin diagnostics" },
      ]);
    } catch (e) {
      console.warn("[boot] setMyCommands failed", { err: e?.message || String(e) });
    }

    bot.catch((err) => {
      const msg = err?.error?.response?.data?.error?.message || err?.error?.response?.data?.message || err?.error?.message || err?.message || String(err);
      console.error("[bot.catch]", { err: msg, updateId: err?.ctx?.update?.update_id });
    });

    startRemindersLoop({ bot, cfg });

    await bot.start({
      onStart: () => console.log("[boot] polling started"),
    });
  } catch (err) {
    console.error("[boot] error", { code: err?.code, msg: String(err?.message || err) });
    if (err?.code === "ERR_MODULE_NOT_FOUND") {
      console.error("Check ESM extensions (.js) and that all referenced files exist under src/.");
    }
    process.exit(1);
  }
}

boot();
