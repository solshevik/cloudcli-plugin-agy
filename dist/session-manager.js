/**
 * Session Continuity Manager for Local Agy Driver
 * Preserves multi-turn conversational context by mapping incoming sessionId
 * to persistent agy --conversation IDs.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const SESSION_STORE_DIR = path.join(os.homedir(), '.claude-code-ui', 'plugins', 'cloudcli-plugin-agy');
const SESSION_STORE_FILE = path.join(SESSION_STORE_DIR, 'sessions.json');
export class SessionContinuityManager {
    sessions = new Map();
    constructor() {
        this.loadFromDisk();
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(SESSION_STORE_FILE)) {
                const raw = fs.readFileSync(SESSION_STORE_FILE, 'utf-8');
                const data = JSON.parse(raw);
                if (Array.isArray(data)) {
                    for (const item of data) {
                        this.sessions.set(item.sessionId, item);
                    }
                }
            }
        }
        catch {
            // Start with empty map on error
        }
    }
    saveToDisk() {
        try {
            if (!fs.existsSync(SESSION_STORE_DIR)) {
                fs.mkdirSync(SESSION_STORE_DIR, { recursive: true });
            }
            const data = Array.from(this.sessions.values());
            fs.writeFileSync(SESSION_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[AgyPlugin:SessionManager] Failed to persist sessions:', err);
        }
    }
    /**
     * Resolves or initializes an agy conversationId for an incoming session.
     */
    getOrCreateConversationId(sessionId) {
        const key = sessionId || `default-${Date.now()}`;
        const existing = this.sessions.get(key);
        if (existing) {
            existing.lastActive = Date.now();
            existing.turnCount += 1;
            this.saveToDisk();
            return { conversationId: existing.conversationId, isNew: false };
        }
        const newConversationId = crypto.randomUUID();
        const newRecord = {
            sessionId: key,
            conversationId: newConversationId,
            lastActive: Date.now(),
            turnCount: 1,
        };
        this.sessions.set(key, newRecord);
        this.saveToDisk();
        return { conversationId: newConversationId, isNew: true };
    }
    listSessions() {
        return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
    }
    clearSessions() {
        this.sessions.clear();
        this.saveToDisk();
    }
}
export const sessionManager = new SessionContinuityManager();
//# sourceMappingURL=session-manager.js.map