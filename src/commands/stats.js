const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getMemberTier, ACTION_STYLES } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View moderation statistics')
        .addUserOption(option =>
            option.setName('moderator')
                .setDescription('View stats for a specific moderator')
                .setRequired(false)),

    async execute(interaction) {
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (!tier) {
            return interaction.reply({
                content: '❌ You do not have permission to use moderation commands.',
                ephemeral: true,
            });
        }

        const moderator = interaction.options.getUser('moderator');

        if (moderator) {
            // ── Per-moderator stats ──
            const personalStats = db.getModeratorPersonalStats(interaction.guildId, moderator.id);

            if (personalStats.length === 0) {
                return interaction.reply({
                    content: `📭 No moderation actions logged by <@${moderator.id}>.`,
                    ephemeral: true,
                });
            }

            const total = personalStats.reduce((sum, s) => sum + s.count, 0);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📊 Moderator Stats — ${moderator.tag}`)
                .setThumbnail(moderator.displayAvatarURL())
                .setDescription(`**${total}** total actions logged`)
                .setTimestamp();

            for (const stat of personalStats) {
                const style = ACTION_STYLES[stat.action_type] || { emoji: '❓', label: stat.action_type };
                embed.addFields({
                    name: `${style.emoji} ${style.label}`,
                    value: `${stat.count}`,
                    inline: true,
                });
            }

            return interaction.reply({ embeds: [embed] });
        }

        // ── Guild-wide stats ──
        const totalCount = db.getTotalCount(interaction.guildId);
        const actionStats = db.getStats(interaction.guildId);
        const modStats = db.getModeratorStats(interaction.guildId);

        if (totalCount === 0) {
            return interaction.reply({
                content: '📭 No moderation actions have been logged yet.',
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Moderation Statistics')
            .setDescription(`**${totalCount}** total actions logged`)
            .setTimestamp();

        // Action type breakdown
        const breakdown = actionStats.map(s => {
            const style = ACTION_STYLES[s.action_type] || { emoji: '❓', label: s.action_type };
            return `${style.emoji} **${style.label}:** ${s.count}`;
        }).join('\n');

        if (breakdown) {
            embed.addFields({ name: '📋 Action Breakdown', value: breakdown, inline: false });
        }

        // Top moderators
        if (modStats.length > 0) {
            const topMods = modStats.map((m, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || '▫️';
                return `${medal} <@${m.moderator_id}> — ${m.count} actions`;
            }).join('\n');

            embed.addFields({ name: '🛡️ Top Moderators', value: topMods, inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    },
};
