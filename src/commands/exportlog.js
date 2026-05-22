const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database');
const { getMemberTier } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exportlog')
        .setDescription('Export moderation logs as a CSV file')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of records to export (default 100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000))
        .addStringOption(option =>
            option.setName('vrchat_user')
                .setDescription('Filter by VRChat username (optional)')
                .setRequired(false)),

    async execute(interaction) {
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (tier !== 'ADMIN') {
            return interaction.reply({
                content: '❌ Only Administrators can export moderation logs.',
                ephemeral: true,
            });
        }

        const count = interaction.options.getInteger('count') || 100;
        const vrchatUser = interaction.options.getString('vrchat_user');

        const actions = db.exportActions(interaction.guildId, count, vrchatUser);

        if (actions.length === 0) {
            return interaction.reply({
                content: '📭 No records found to export.',
                ephemeral: true,
            });
        }

        // Build CSV
        const headers = ['Case #', 'Action', 'VRChat User', 'Reason', 'Moderator', 'Instance', 'Date'];
        const rows = actions.map(a => [
            a.id,
            a.action_type,
            escapeCsv(a.vrchat_username),
            escapeCsv(a.reason),
            escapeCsv(a.moderator_tag),
            escapeCsv(a.instance_info || ''),
            a.created_at,
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const buffer = Buffer.from(csv, 'utf-8');

        const filename = vrchatUser
            ? `modlog_${vrchatUser.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`
            : `modlog_export_${Date.now()}.csv`;

        const attachment = new AttachmentBuilder(buffer, { name: filename });

        await interaction.reply({
            content: `📄 Exported **${actions.length}** record(s).`,
            files: [attachment],
        });
    },
};

/**
 * Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines).
 */
function escapeCsv(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
