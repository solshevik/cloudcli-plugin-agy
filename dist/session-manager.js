/**
 * Session Continuity Manager for Local Agy Driver
 * Preserves multi-turn conversational context and chat history by mapping incoming
 * sessionId to persistent agy --conversation IDs and maintaining message history.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const SESSION_STORE_DIR = path.join(os.homedir(), '.claude-code-ui');
const SESSION_STORE_FILE = path.join(SESSION_STORE_DIR, 'agy-sessions.json');
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
                        this.sessions.set(item.sessionId, {
                            sessionId: item.sessionId,
                            conversationId: item.conversationId,
                            title: item.title || '新会话',
                            lastActive: item.lastActive || Date.now(),
                            turnCount: item.turnCount || 0,
                            messages: Array.isArray(item.messages) ? item.messages : [],
                        });
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
    getOrCreateConversationId(sessionId, initialTitle) {
        const key = sessionId || `sess-${Date.now()}`;
        const existing = this.sessions.get(key);
        if (existing) {
            existing.lastActive = Date.now();
            existing.turnCount += 1;
            if (!existing.messages)
                existing.messages = [];
            this.saveToDisk();
            return { conversationId: existing.conversationId, isNew: false, record: existing };
        }
        const newConversationId = crypto.randomUUID();
        const newRecord = {
            sessionId: key,
            conversationId: newConversationId,
            title: initialTitle || '新会话',
            lastActive: Date.now(),
            turnCount: 1,
            messages: [],
        };
        this.sessions.set(key, newRecord);
        this.saveToDisk();
        return { conversationId: newConversationId, isNew: true, record: newRecord };
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    addMessage(sessionId, message) {
        const { record } = this.getOrCreateConversationId(sessionId);
        const chatMsg = {
            id: crypto.randomUUID(),
            role: message.role,
            content: message.content,
            timestamp: Date.now(),
            model: message.model,
        };
        if (!record.messages)
            record.messages = [];
        record.messages.push(chatMsg);
        record.lastActive = Date.now();
        // Auto-update title if it's the first user message
        if (message.role === 'user' && record.title === '新会话') {
            const cleanText = message.content.trim().replace(/\n+/g, ' ');
            record.title = cleanText.length > 20 ? cleanText.slice(0, 20) + '...' : cleanText;
        }
        this.saveToDisk();
        return chatMsg;
    }
    listSessions() {
        return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
    }
    deleteSession(sessionId) {
        const deleted = this.sessions.delete(sessionId);
        if (deleted)
            this.saveToDisk();
        return deleted;
    }
    clearSessions() {
        this.sessions.clear();
        this.saveToDisk();
    }
}
export const sessionManager = new SessionContinuityManager();
//# sourceMappingURL=session-manager.js.map