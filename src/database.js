const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'moderation.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrent read performance
db.exec('PRAGMA journal_mode = WAL');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
    CREATE TABLE IF NOT EXISTS mod_actions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id        TEXT    NOT NULL,
        action_type     TEXT    NOT NULL,
        vrchat_username TEXT    NOT NULL,
        reason          TEXT    NOT NULL,
        moderator_id    TEXT    NOT NULL,
        moderator_tag   TEXT    NOT NULL,
        instance_info   TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id        TEXT    PRIMARY KEY,
        log_channel_id  TEXT,
        mod_role_id     TEXT,
        admin_role_id   TEXT,
        starter_role_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mod_actions_guild
        ON mod_actions(guild_id);
    CREATE INDEX IF NOT EXISTS idx_mod_actions_vrchat_user
        ON mod_actions(vrchat_username COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_mod_actions_moderator
        ON mod_actions(moderator_id);
`);

// Safe migrations for existing databases
try { db.exec("ALTER TABLE guild_config ADD COLUMN admin_role_id TEXT"); } catch(e){}
try { db.exec("ALTER TABLE guild_config ADD COLUMN starter_role_id TEXT"); } catch(e){}


// ─── Prepared Statements ─────────────────────────────────────────────────────

const stmts = {
    insertAction: db.prepare(`
        INSERT INTO mod_actions (guild_id, action_type, vrchat_username, reason, moderator_id, moderator_tag, instance_info, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getAction: db.prepare(`
        SELECT * FROM mod_actions WHERE id = ? AND guild_id = ?
    `),

    getHistory: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ? AND vrchat_username COLLATE NOCASE = ?
        ORDER BY created_at DESC
    `),

    searchHistory: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ? AND vrchat_username LIKE ? COLLATE NOCASE
        ORDER BY created_at DESC
        LIMIT 25
    `),

    getModeratorActions: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ? AND moderator_id = ?
        ORDER BY created_at DESC
        LIMIT 25
    `),

    getRecentActions: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `),

    getStats: db.prepare(`
        SELECT action_type, COUNT(*) as count
        FROM mod_actions
        WHERE guild_id = ?
        GROUP BY action_type
    `),

    getModeratorStats: db.prepare(`
        SELECT moderator_tag, moderator_id, COUNT(*) as count
        FROM mod_actions
        WHERE guild_id = ?
        GROUP BY moderator_id
        ORDER BY count DESC
        LIMIT 10
    `),

    getModeratorPersonalStats: db.prepare(`
        SELECT action_type, COUNT(*) as count
        FROM mod_actions
        WHERE guild_id = ? AND moderator_id = ?
        GROUP BY action_type
    `),

    getTotalCount: db.prepare(`
        SELECT COUNT(*) as count FROM mod_actions WHERE guild_id = ?
    `),

    updateReason: db.prepare(`
        UPDATE mod_actions SET reason = ? WHERE id = ? AND guild_id = ?
    `),

    deleteAction: db.prepare(`
        DELETE FROM mod_actions WHERE id = ? AND guild_id = ?
    `),

    // Guild config
    getConfig: db.prepare(`
        SELECT * FROM guild_config WHERE guild_id = ?
    `),

    upsertLogChannel: db.prepare(`
        INSERT INTO guild_config (guild_id, log_channel_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET log_channel_id = excluded.log_channel_id
    `),

    upsertModRole: db.prepare(`
        INSERT INTO guild_config (guild_id, mod_role_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET mod_role_id = excluded.mod_role_id
    `),

    upsertAdminRole: db.prepare(`
        INSERT INTO guild_config (guild_id, admin_role_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET admin_role_id = excluded.admin_role_id
    `),

    upsertStarterRole: db.prepare(`
        INSERT INTO guild_config (guild_id, starter_role_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET starter_role_id = excluded.starter_role_id
    `),


    exportActions: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `),

    exportActionsForUser: db.prepare(`
        SELECT * FROM mod_actions
        WHERE guild_id = ? AND vrchat_username LIKE ? COLLATE NOCASE
        ORDER BY created_at DESC
        LIMIT ?
    `),
};

// ─── Public API ──────────────────────────────────────────────────────────────

module.exports = {
    /**
     * Log a new moderation action.
     * @returns {Object} The inserted row (with id)
     */
    logAction({ guild_id, action_type, vrchat_username, reason, moderator_id, moderator_tag, instance_info }) {
        const created_at = new Date().toISOString();
        const result = stmts.insertAction.run(
            guild_id,
            action_type,
            vrchat_username,
            reason,
            moderator_id,
            moderator_tag,
            instance_info || null,
            created_at
        );
        return { id: result.lastInsertRowid, created_at };
    },

    /** Get a single case by ID */
    getAction(id, guild_id) {
        return stmts.getAction.get(id, guild_id);
    },

    /** Get all actions for a VRChat username (exact match, case-insensitive) */
    getHistory(guild_id, vrchat_username) {
        return stmts.getHistory.all(guild_id, vrchat_username);
    },

    /** Search actions by partial VRChat username */
    searchHistory(guild_id, query) {
        return stmts.searchHistory.all(guild_id, `%${query}%`);
    },

    /** Get actions performed by a specific moderator */
    getModeratorActions(guild_id, moderator_id) {
        return stmts.getModeratorActions.all(guild_id, moderator_id);
    },

    /** Get recent actions for the guild */
    getRecentActions(guild_id, limit = 10) {
        return stmts.getRecentActions.all(guild_id, limit);
    },

    /** Get action type counts for the guild */
    getStats(guild_id) {
        return stmts.getStats.all(guild_id);
    },

    /** Get top moderators by action count */
    getModeratorStats(guild_id) {
        return stmts.getModeratorStats.all(guild_id);
    },

    /** Get a specific moderator's action breakdown */
    getModeratorPersonalStats(guild_id, moderator_id) {
        return stmts.getModeratorPersonalStats.all(guild_id, moderator_id);
    },

    /** Get total action count */
    getTotalCount(guild_id) {
        const row = stmts.getTotalCount.get(guild_id);
        return row ? row.count : 0;
    },

    /** Update the reason on a case */
    updateReason(id, guild_id, newReason) {
        return stmts.updateReason.run(newReason, id, guild_id);
    },

    /** Delete a case */
    deleteAction(id, guild_id) {
        return stmts.deleteAction.run(id, guild_id);
    },

    /** Get guild config */
    getConfig(guild_id) {
        return stmts.getConfig.get(guild_id);
    },

    /** Set the mod-log channel */
    setLogChannel(guild_id, channel_id) {
        return stmts.upsertLogChannel.run(guild_id, channel_id);
    },

    /** Set the required moderator role */
    setModRole(guild_id, role_id) {
        return stmts.upsertModRole.run(guild_id, role_id);
    },

    /** Set the required admin role */
    setAdminRole(guild_id, role_id) {
        return stmts.upsertAdminRole.run(guild_id, role_id);
    },

    /** Set the required starter moderator role */
    setStarterRole(guild_id, role_id) {
        return stmts.upsertStarterRole.run(guild_id, role_id);
    },


    /** Export actions (optionally filtered by user) */
    exportActions(guild_id, limit = 100, vrchat_username = null) {
        if (vrchat_username) {
            return stmts.exportActionsForUser.all(guild_id, `%${vrchat_username}%`, limit);
        }
        return stmts.exportActions.all(guild_id, limit);
    },

    /** Close the database (for graceful shutdown) */
    close() {
        db.close();
    },
};
