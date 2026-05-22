const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getMemberTier, buildActionEmbed } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('View, edit, or delete a moderation case')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View details of a specific case')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Case number')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit the reason on a case')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Case number')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('New reason')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete a case (admin only)')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('Case number')
                        .setRequired(true)
                        .setMinValue(1))),

    async execute(interaction) {
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (!tier) {
            return interaction.reply({
                content: '❌ You do not have permission to use moderation commands.',
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const caseId = interaction.options.getInteger('id');

        const action = db.getAction(caseId, interaction.guildId);
        if (!action) {
            return interaction.reply({
                content: `❌ Case #${caseId} not found.`,
                ephemeral: true,
            });
        }

        switch (subcommand) {
            case 'view': {
                const embed = buildActionEmbed(action);
                return interaction.reply({ embeds: [embed] });
            }

            case 'edit': {
                const isOriginalMod = action.moderator_id === interaction.user.id;
                const isAdmin = tier === 'ADMIN';
                const isFullMod = tier === 'MOD';

                if (!isAdmin && (!isFullMod || !isOriginalMod)) {
                    return interaction.reply({
                        content: '❌ You can only edit a case if you are the original moderator who created it or an Admin.',
                        ephemeral: true,
                    });
                }

                const newReason = interaction.options.getString('reason');
                db.updateReason(caseId, interaction.guildId, newReason);

                return interaction.reply({
                    content: `✅ Case #${caseId} reason updated to: **${newReason}**`,
                });
            }

            case 'delete': {
                if (tier !== 'ADMIN') {
                    return interaction.reply({
                        content: '❌ Only Administrators can delete cases from the database.',
                        ephemeral: true,
                    });
                }

                db.deleteAction(caseId, interaction.guildId);

                return interaction.reply({
                    content: `🗑️ Case #${caseId} (${action.action_type} on **${action.vrchat_username}**) has been deleted by <@${interaction.user.id}>.`,
                });
            }
        }
    },
};
