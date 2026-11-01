/**
 * CloudCLI Plugin API and Agy Driver type definitions.
 */
export interface PluginContext {
    theme: 'dark' | 'light';
    project: {
        name: string;
        path: string;
    } | null;
    session: {
        id: string;
        title: string;
    } | null;
}
export interface PluginAPI {
    readonly context: PluginContext;
    onContextChange(callback: (ctx: PluginContext) => void): () => void;
    rpc(method: string, path: string, body?: unknown): Promise<unknown>;
}
export interface PluginModule {
    mount(container: HTMLElement, api: PluginAPI): void | Promise<void>;
    unmount?(container: HTMLElement): void;
}
export interface UnifiedMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{
        type: string;
        text?: string;
        [key: string]: unknown;
    }>;
    name?: string;
}
export interface UnifiedChatRequest {
    model: string;
    messages: UnifiedMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    sessionId?: string;
    thinkingBudget?: number;
}
export interface UnifiedChunk {
    type: 'text' | 'thinking' | 'done' | 'error';
    content: string;
    isFinished?: boolean;
}
export interface DiagnosticInfo {
    code: 'CLI_NOT_FOUND' | 'AUTH_REQUIRED' | 'PROCESS_ERROR' | 'HEALTHY';
    message: string;
    details?: string;
    fixCommand?: string;
}
export interface AgyStatus {
    installed: boolean;
    version: string;
    path: string;
    supportedModels: string[];
    activeSessions: number;
    diagnostics?: DiagnosticInfo;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    model?: string;
}
export interface AgySessionRecord {
    sessionId: string;
    conversationId: string;
    title: string;
    lastActive: number;
    turnCount: number;
    messages: ChatMessage[];
}
export interface TestBenchmarkResult {
    success: boolean;
    latencyMs?: number;
    output?: string;
    error?: string;
    diagnostics?: DiagnosticInfo;
}
//# sourceMappingURL=types.d.ts.map