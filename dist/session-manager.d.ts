/**
 * Session Continuity Manager for Local Agy Driver
 * Preserves multi-turn conversational context and chat history by mapping incoming
 * sessionId to persistent agy --conversation IDs and maintaining message history.
 */
import type { AgySessionRecord, ChatMessage } from './types.js';
export declare class SessionContinuityManager {
    private sessions;
    constructor();
    private loadFromDisk;
    private saveToDisk;
    /**
     * Resolves or initializes an agy conversationId for an incoming session.
     */
    getOrCreateConversationId(sessionId?: string, initialTitle?: string): {
        conversationId: string;
        isNew: boolean;
        record: AgySessionRecord;
    };
    getSession(sessionId: string): AgySessionRecord | undefined;
    addMessage(sessionId: string, message: {
        role: 'user' | 'assistant';
        content: string;
        model?: string;
    }): ChatMessage;
    listSessions(): AgySessionRecord[];
    deleteSession(sessionId: string): boolean;
    clearSessions(): void;
}
export declare const sessionManager: SessionContinuityManager;
//# sourceMappingURL=session-manager.d.ts.map