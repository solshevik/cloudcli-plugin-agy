/**
 * Core Google Antigravity (agy) Local Process Driver
 *
 * Handles CLI binary detection, version probing, prompt cleaning,
 * session continuity parameter mapping, and stream-json event parsing.
 */
import type { AgyStatus, UnifiedChatRequest, UnifiedChunk } from './types.js';
export declare class AgyDriver {
    private cachedAgyPath;
    /**
     * Resolves the absolute path to the local agy executable.
     */
    resolveAgyPath(): string;
    /**
     * Probes system for agy CLI status, version, and diagnostic health.
     */
    getStatus(): Promise<AgyStatus>;
    /**
     * Resolves target model name, mapping requested models or thinkingBudget.
     */
    resolveModelName(requestedModel?: string, thinkingBudget?: number): string;
    /**
     * Formats unified chat messages into a clean single prompt turn for agy CLI.
     */
    extractPrompt(messages: UnifiedChatRequest['messages']): string;
    /**
     * Executes a turn using the local agy CLI and yields streaming text chunks.
     */
    executeChat(request: UnifiedChatRequest): AsyncIterable<UnifiedChunk>;
}
export declare const agyDriver: AgyDriver;
//# sourceMappingURL=driver.d.ts.map