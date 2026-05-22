const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMemberTier } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setDescription('Learn how to use the moderation bot and standard procedures'),

    async execute(interaction) {
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (!tier) {
            return interaction.reply({
                content: '❌ This command is only available to moderation staff.',
                ephemeral: true,
            });
        }

        const embed1 = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📖 VRChat Staff Handbook & Bot Tutorial')
            .setDescription(
                `Welcome to the VRChat Staff team! This bot acts as our central **moderation record keeper** for all in-game actions taken in our group and instances.`
            )
            .addFields(
                {
                    name: '🚀 How to Log Actions',
                    value: `Use the \`/log\` command when you perform a moderation action in-game:\n` +
                        `**\` /log <action> <vrchat_user> <reason> [instance] \`**\n\n` +
                        `• **action:** Kick, Ban, Warning, Mute, or Note.\n` +
                        `• **vrchat_user:** The exact VRChat display name.\n` +
                        `• **reason:** Be descriptive (see templates below).\n` +
                        `• **instance:** *[Optional]* World/instance ID where it happened.`
                },
                {
                    name: '🔍 Checking Player Records',
                    value: `Before taking action, check if they are a repeat offender:\n` +
                        `**\` /history <vrchat_user> \`**\n` +
                        `*(Will check for exact matches or show partial matches)*`
                },
                {
                    name: '🛡️ Moderator Tiers & What You Can Do',
                    value: `• **Starter Mod (Green):** Can log **Kicks, Warns, Mutes, Notes**, and view history.\n` +
                        `• **Full Mod (Blue):** All Starter actions + can log **Bans** and edit their own logs (\`/case edit\`).\n` +
                        `• **Admin (Red):** All Full Mod actions + bot settings (\`/config\`), delete logs, and CSV exports (\`/exportlog\`).`
                }
            )
            .setTimestamp();

        const embed2 = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🔞 Standard Operating Procedure: Age Verification')
            .setDescription(
                `VRChat requires users to be at least **13 years old**. To verify a user's age under suspicion:`
            )
            .addFields(
                {
                    name: '💬 How to Ask (Be Professional & Polite)',
                    value: `*Do not be aggressive or confrontational.* Use this template:\n` +
                        `> *"Hey [Username], just doing a routine check to make sure we're keeping our instance compliant with VRChat rules. Could you verify your age for me?"*`
                },
                {
                    name: '⚖️ Action Matrix for Age Verification',
                    value: `• **Admits to being under 13:** Group Ban + Instance Kick. Log as \`BAN\` with reason: \`Underage: Confirmed under 13 (stated age: [X]).\`\n` +
                        `• **Refuses / Evades:** Instance Kick. Log as \`KICK\` with reason: \`Refusal to verify age upon moderator request.\`\n` +
                        `• **Lies / Contradicts self:** Warning or Kick (discretionary). Log as \`WARN\` or \`KICK\`.`
                },
                {
                    name: '📝 Standard Logging Templates (Use in /log)',
                    value: `• **Hate Speech:** \`[Slurs/Harassment] Used offensive language toward players in instance.\`\n` +
                        `• **Crasher:** \`[Crasher] Used a malicious/lagging avatar to crash the lobby.\`\n` +
                        `• **Mic Spam:** \`[Disturbance] Loud music/mic spamming after initial warning.\``
                }
            )
            .setFooter({ text: 'VRChat Staff Handbook • Run /tutorial to see this again' });

        await interaction.reply({ embeds: [embed1, embed2], ephemeral: true });
    },
};
