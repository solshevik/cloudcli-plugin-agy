/**
 * Session Continuity Manager for Local Agy Driver
 * Preserves multi-turn conversational context by mapping incoming sessionId
 * to persistent agy --conversation IDs.
 */
import type { AgySessionRecord } from './types.js';
export declare class SessionContinuityManager {
    private sessions;
    constructor();
    private loadFromDisk;
    private saveToDisk;
    /**
     * Resolves or initializes an agy conversationId for an incoming session.
     */
    getOrCreateConversationId(sessionId?: string): {
        conversationId: string;
        isNew: boolean;
    };
    listSessions(): AgySessionRecord[];
    clearSessions(): void;
}
export declare const sessionManager: SessionContinuityManager;
//# sourceMappingURL=session-manager.d.ts.map