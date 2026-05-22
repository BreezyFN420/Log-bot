# VRChat Mod Bot 🛡️

A Discord bot for logging and tracking VRChat moderation actions across your community.

## Features

- `/log` — Log moderation actions (Kick, Ban, Warn, Mute, Note)
- `/history` — Look up a VRChat user's full moderation history
- `/case` — View, edit, or delete individual cases
- `/stats` — Server-wide or per-moderator action statistics
- `/exportlog` — Export logs as a CSV file (Admin only)
- `/config` — Configure roles and log channel
- `/tutorial` — Staff handbook and logging templates

## Setup

### 1. Prerequisites
- **Node.js v22.5 or higher** (uses built-in `node:sqlite`)
- A Discord bot application from [discord.com/developers](https://discord.com/developers/applications)

### 2. Clone & Install
```bash
git clone https://github.com/BreezyFN420/Log-bot.git
cd Log-bot
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
```env
DISCORD_TOKEN=your-bot-token-here
CLIENT_ID=your-application-client-id-here
GUILD_ID=your-server-id-here
```

### 4. Enable Required Intents
In the [Discord Developer Portal](https://discord.com/developers/applications):
- Go to your app → **Bot** tab
- Enable **Server Members Intent** (required for role-based permission checks)

### 5. Deploy Commands
```bash
# Register to your test server (instant):
npm run deploy

# Or register globally (up to 1 hour delay):
npm run deploy:global
```

### 6. Start the Bot
```bash
npm start
```

### 7. Configure the Bot in Discord
Run `/config setup-roles` to auto-create staff roles, then `/config set-log-channel #your-channel`.

## Moderator Tiers

| Tier | What They Can Do |
|------|-----------------|
| 🟢 **Starter Mod** | Log Kicks, Warns, Mutes, Notes; view history |
| 🔵 **Full Mod** | All above + log Bans + edit own cases |
| 🔴 **Admin** | All above + delete cases, export CSV, configure bot |

> Users with the **Manage Server** Discord permission are always treated as Admin tier.

## Security Notes

- **Never commit `.env`** — it contains your bot token. The `.gitignore` already excludes it.
- If your token is ever exposed publicly, **regenerate it immediately** in the Developer Portal.
- The `data/` folder (SQLite database) is also gitignored to protect user data.
