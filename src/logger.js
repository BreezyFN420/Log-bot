const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

// Color and emoji mappings for each action type
const ACTION_STYLES = {
    KICK:  { color: 0xFFA500, emoji: '👢', label: 'Kick' },
    BAN:   { color: 0xFF0000, emoji: '🔨', label: 'Ban' },
    WARN:  { color: 0xFFCC00, emoji: '⚠️', label: 'Warning' },
    MUTE:  { color: 0x9B59B6, emoji: '🔇', label: 'Mute' },
    NOTE:  { color: 0x3498DB, emoji: '📝', label: 'Note' },
};

/**
 * Build a mod-log embed for an action.
 */
function buildActionEmbed(action) {
    const style = ACTION_STYLES[action.action_type] || { color: 0x95A5A6, emoji: '❓', label: action.action_type };

    const embed = new EmbedBuilder()
        .setColor(style.color)
        .setTitle(`${style.emoji}  ${style.label} — Case #${action.id}`)
        .addFields(
            { name: '🎮 VRChat User', value: action.vrchat_username, inline: true },
            { name: '🛡️ Moderator', value: `<@${action.moderator_id}> (${action.moderator_tag})`, inline: true },
        )
        .setTimestamp(new Date(action.created_at))
        .setFooter({ text: `Case #${action.id}` });

    // Reason field (full width)
    embed.addFields({ name: '📋 Reason', value: action.reason, inline: false });

    // Optional instance info
    if (action.instance_info) {
        embed.addFields({ name: '🌍 Instance', value: action.instance_info, inline: true });
    }

    return embed;
}

/**
 * Post an action embed to the guild's configured log channel.
 * Returns true if posted successfully, false otherwise.
 */
async function postToLogChannel(client, guildId, action) {
    const config = db.getConfig(guildId);
    if (!config || !config.log_channel_id) return false;

    try {
        const channel = await client.channels.fetch(config.log_channel_id);
        if (!channel || !channel.isTextBased()) return false;

        const embed = buildActionEmbed(action);
        await channel.send({ embeds: [embed] });
        return true;
    } catch (err) {
        console.error(`Failed to post to log channel for guild ${guildId}:`, err.message);
        return false;
    }
}

/**
 * Determine a member's moderation tier: 'ADMIN', 'MOD', 'STARTER', or null.
 */
function getMemberTier(member, guildId) {
    // If the member has Manage Guild permission, they are automatically an ADMIN
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return 'ADMIN';
    }

    const config = db.getConfig(guildId);
    if (!config) {
        // No configuration yet: default to allowing everyone as ADMIN so the bot can be configured
        return 'ADMIN';
    }

    const roles = member.roles.cache;

    // Check Admin Role
    if (config.admin_role_id && roles.has(config.admin_role_id)) {
        return 'ADMIN';
    }

    // Check Full Mod Role
    if (config.mod_role_id && roles.has(config.mod_role_id)) {
        return 'MOD';
    }

    // Check Starter Mod Role
    if (config.starter_role_id && roles.has(config.starter_role_id)) {
        return 'STARTER';
    }

    // If NO roles are configured yet, treat everyone as a STARTER (and ManageGuild as ADMIN)
    const hasAnyRoleConfigured = config.admin_role_id || config.mod_role_id || config.starter_role_id;
    if (!hasAnyRoleConfigured) {
        return 'STARTER';
    }

    return null;
}

module.exports = {
    ACTION_STYLES,
    buildActionEmbed,
    postToLogChannel,
    getMemberTier,
};
