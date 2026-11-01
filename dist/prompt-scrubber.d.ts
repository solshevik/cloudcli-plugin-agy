/**
 * Prompt & Harness Scrubber for Agy Driver
 * Strips client harness XML tags and irrelevant environmental metadata.
 */
/**
 * Strips client-internal XML wrapper blocks that trigger false-positive
 * prompt injection defenses in local agy/gemini models.
 */
export declare function scrubHarnessBlocks(text: string): string;
/**
 * Scrubs irrelevant environmental noise (timezone, OS headers) from prompts.
 */
export declare function scrubPromptMetadata(text: string): string;
/**
 * Master cleanup pipeline for incoming prompts.
 */
export declare function cleanPrompt(raw: string): string;
//# sourceMappingURL=prompt-scrubber.d.ts.map