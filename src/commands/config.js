const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getMemberTier } = require('../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure the moderation bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('set-log-channel')
                .setDescription('Set the channel where moderation logs are posted')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The log channel')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub =>
            sub.setName('set-admin-role')
                .setDescription('Set the Admin role (can manage all logs and settings)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The Admin role')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('set-mod-role')
                .setDescription('Set the Full Moderator role (can log all actions, edit own logs)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The Full Moderator role')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('set-starter-role')
                .setDescription('Set the Starter Moderator role (can log warns/mutes/notes)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The Starter Moderator role')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('setup-roles')
                .setDescription('Automatically create and map Starter Mod, Full Mod, and Admin roles in the server'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current configuration')),

    async execute(interaction) {
        // Enforce Admin tier check even if they run via command routing
        const tier = getMemberTier(interaction.member, interaction.guildId);
        if (tier !== 'ADMIN') {
            return interaction.reply({
                content: '❌ Only Administrators can configure the bot.',
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup-roles': {
                await interaction.deferReply({ ephemeral: true });

                try {
                    // Create Admin role
                    const adminRole = await interaction.guild.roles.create({
                        name: 'VRChat Admin',
                        color: 0xE74C3C, // Red
                        reason: 'VRChat Mod Bot automatic role setup',
                    });

                    // Create Mod role
                    const modRole = await interaction.guild.roles.create({
                        name: 'VRChat Moderator',
                        color: 0x3498DB, // Blue
                        reason: 'VRChat Mod Bot automatic role setup',
                    });

                    // Create Starter Mod role
                    const starterRole = await interaction.guild.roles.create({
                        name: 'VRChat Starter Mod',
                        color: 0x2ECC71, // Green
                        reason: 'VRChat Mod Bot automatic role setup',
                    });

                    // Map in DB
                    db.setAdminRole(interaction.guildId, adminRole.id);
                    db.setModRole(interaction.guildId, modRole.id);
                    db.setStarterRole(interaction.guildId, starterRole.id);

                    return interaction.editReply({
                        content: `✅ Automatically created and configured staff roles:\n` +
                            `1. <@&${adminRole.id}> (Admin tier)\n` +
                            `2. <@&${modRole.id}> (Full Mod tier)\n` +
                            `3. <@&${starterRole.id}> (Starter Mod tier)\n\n` +
                            `*You can now assign these roles to your moderators in server settings.*`,
                    });
                } catch (error) {
                    console.error('Failed to setup roles:', error);
                    return interaction.editReply({
                        content: `❌ Failed to create roles. Make sure the bot has the **Manage Roles** permission and its role is positioned above the roles it's trying to manage.`,
                    });
                }
            }

            case 'set-log-channel': {
                const channel = interaction.options.getChannel('channel');
                db.setLogChannel(interaction.guildId, channel.id);

                return interaction.reply({
                    content: `✅ Mod-log channel set to <#${channel.id}>. All moderation logs will be posted there.`,
                    ephemeral: true,
                });
            }

            case 'set-admin-role': {
                const role = interaction.options.getRole('role');
                db.setAdminRole(interaction.guildId, role.id);

                return interaction.reply({
                    content: `✅ Admin role set to <@&${role.id}>. Members with this role can run all commands.`,
                    ephemeral: true,
                });
            }

            case 'set-mod-role': {
                const role = interaction.options.getRole('role');
                db.setModRole(interaction.guildId, role.id);

                return interaction.reply({
                    content: `✅ Full Moderator role set to <@&${role.id}>. Members with this role can log all actions.`,
                    ephemeral: true,
                });
            }

            case 'set-starter-role': {
                const role = interaction.options.getRole('role');
                db.setStarterRole(interaction.guildId, role.id);

                return interaction.reply({
                    content: `✅ Starter Moderator role set to <@&${role.id}>. Members with this role can log warns/mutes/notes.`,
                    ephemeral: true,
                });
            }

            case 'view': {
                const config = db.getConfig(interaction.guildId);

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('⚙️ Bot Configuration')
                    .addFields(
                        {
                            name: '📋 Log Channel',
                            value: config?.log_channel_id
                                ? `<#${config.log_channel_id}>`
                                : '*Not set — use `/config set-log-channel`*',
                            inline: false,
                        },
                        {
                            name: '🔴 Admin Role',
                            value: config?.admin_role_id
                                ? `<@&${config.admin_role_id}>`
                                : '*Not set (Defaults to users with Manage Guild)*',
                            inline: true,
                        },
                        {
                            name: '🔵 Full Moderator Role',
                            value: config?.mod_role_id
                                ? `<@&${config.mod_role_id}>`
                                : '*Not set*',
                            inline: true,
                        },
                        {
                            name: '🟢 Starter Moderator Role',
                            value: config?.starter_role_id
                                ? `<@&${config.starter_role_id}>`
                                : '*Not set*',
                            inline: true,
                        },
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
