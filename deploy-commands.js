/**
 * deploy-commands.js
 *
 * Run this script once (or whenever you change command definitions) to register
 * your slash commands with Discord.
 *
 * Usage:
 *   node deploy-commands.js          — registers to your test guild (instant)
 *   node deploy-commands.js --global — registers globally (takes up to 1 hour)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
    console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in .env');
    process.exit(1);
}

// Load all command data
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`📦 Loaded: /${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        const isGlobal = process.argv.includes('--global');

        if (isGlobal) {
            console.log(`\n🌐 Registering ${commands.length} command(s) globally...`);
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('✅ Global commands registered! (may take up to 1 hour to appear)');
        } else {
            if (!guildId) {
                console.error('❌ GUILD_ID must be set in .env for guild-specific deployment.');
                console.error('   Or use --global to register globally.');
                process.exit(1);
            }

            console.log(`\n🏠 Registering ${commands.length} command(s) to guild ${guildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log('✅ Guild commands registered! (available immediately)');
        }
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();
