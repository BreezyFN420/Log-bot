const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { postToLogChannel, getMemberTier } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Log a VRChat moderation action')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Type of moderation action')
                .setRequired(true)
                .addChoices(
                    { name: '👢 Kick', value: 'KICK' },
                    { name: '🔨 Ban', value: 'BAN' },
                    { name: '⚠️ Warn', value: 'WARN' },
                    { name: '🔇 Mute', value: 'MUTE' },
                    { name: '📝 Note', value: 'NOTE' },
                ))
        .addStringOption(option =>
            option.setName('vrchat_user')
                .setDescription('VRChat username of the person')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the action')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('instance')
                .setDescription('VRChat world/instance (optional)')
                .setRequired(false)),

    async execute(interaction) {
        // Permission check
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (!tier) {
            return interaction.reply({
                content: '❌ You do not have permission to use moderation commands.',
                ephemeral: true,
            });
        }

        const actionType = interaction.options.getString('action');

        // Escalate permissions for BAN
        if (actionType === 'BAN' && tier === 'STARTER') {
            return interaction.reply({
                content: `❌ Starter Moderators cannot log **BAN** actions. Only Full Moderators and Admins can.`,
                ephemeral: true,
            });
        }

        const vrchatUser = interaction.options.getString('vrchat_user');
        const reason = interaction.options.getString('reason');
        const instance = interaction.options.getString('instance');

        // Log to database
        const result = db.logAction({
            guild_id: interaction.guildId,
            action_type: actionType,
            vrchat_username: vrchatUser,
            reason,
            moderator_id: interaction.user.id,
            moderator_tag: interaction.user.tag,
            instance_info: instance,
        });

        // Build the full action object for the embed
        const action = {
            id: result.id,
            guild_id: interaction.guildId,
            action_type: actionType,
            vrchat_username: vrchatUser,
            reason,
            moderator_id: interaction.user.id,
            moderator_tag: interaction.user.tag,
            instance_info: instance,
            created_at: result.created_at,
        };

        // Post to log channel
        const posted = await postToLogChannel(interaction.client, interaction.guildId, action);

        const emoji = { KICK: '👢', BAN: '🔨', WARN: '⚠️', MUTE: '🔇', NOTE: '📝' };

        let replyText = `${emoji[actionType] || '✅'} **${actionType}** logged for **${vrchatUser}** — Case #${result.id}`;
        if (!posted) {
            replyText += '\n⚠️ *No log channel configured. Use `/config set-log-channel` to set one.*';
        }

        await interaction.reply({ content: replyText, ephemeral: false });
    },
};
