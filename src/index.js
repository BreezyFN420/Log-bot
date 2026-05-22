require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// ─── Create Client ───────────────────────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

// ─── Load Commands ───────────────────────────────────────────────────────────

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`📦 Loaded command: /${command.data.name}`);
    } else {
        console.warn(`⚠️ Command ${file} is missing "data" or "execute" export.`);
    }
}

// ─── Load Events ─────────────────────────────────────────────────────────────

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`⚡ Loaded event: ${event.name}`);
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

process.on('SIGINT', () => {
    console.log('\n🔌 Shutting down...');
    const db = require('./database');
    db.close();
    client.destroy();
    process.exit(0);
});

// ─── Login ───────────────────────────────────────────────────────────────────

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('❌ DISCORD_TOKEN is not set in .env file!');
    console.error('   Copy .env.example to .env and fill in your bot token.');
    process.exit(1);
}

client.login(token);
