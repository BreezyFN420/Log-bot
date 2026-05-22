const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getMemberTier, ACTION_STYLES } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Look up moderation history for a VRChat user')
        .addStringOption(option =>
            option.setName('vrchat_user')
                .setDescription('VRChat username to search for')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (10 results per page)')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction) {
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (!tier) {
            return interaction.reply({
                content: '❌ You do not have permission to use moderation commands.',
                ephemeral: true,
            });
        }

        const vrchatUser = interaction.options.getString('vrchat_user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        // Try exact match first, then partial
        let actions = db.getHistory(interaction.guildId, vrchatUser);
        let searchType = 'exact';

        if (actions.length === 0) {
            actions = db.searchHistory(interaction.guildId, vrchatUser);
            searchType = 'partial';
        }

        if (actions.length === 0) {
            return interaction.reply({
                content: `📭 No moderation history found for **${vrchatUser}**.`,
                ephemeral: true,
            });
        }

        // Paginate
        const totalPages = Math.ceil(actions.length / perPage);
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * perPage;
        const pageActions = actions.slice(start, start + perPage);

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(`📋 Moderation History — ${vrchatUser}`)
            .setDescription(
                searchType === 'partial'
                    ? `*Showing partial matches for "${vrchatUser}"*`
                    : `*${actions.length} record(s) found*`
            )
            .setFooter({ text: `Page ${safePage}/${totalPages} • ${actions.length} total records` })
            .setTimestamp();

        for (const action of pageActions) {
            const style = ACTION_STYLES[action.action_type] || { emoji: '❓', label: action.action_type };
            const timestamp = Math.floor(new Date(action.created_at).getTime() / 1000);

            let fieldValue = `**Reason:** ${action.reason}\n`;
            fieldValue += `**Mod:** <@${action.moderator_id}>\n`;
            fieldValue += `**When:** <t:${timestamp}:R>`;
            if (action.instance_info) {
                fieldValue += `\n**Instance:** ${action.instance_info}`;
            }

            embed.addFields({
                name: `${style.emoji} Case #${action.id} — ${style.label}${action.vrchat_username !== vrchatUser ? ` (${action.vrchat_username})` : ''}`,
                value: fieldValue,
                inline: false,
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
