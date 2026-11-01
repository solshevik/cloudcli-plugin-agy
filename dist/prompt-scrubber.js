/**
 * Prompt & Harness Scrubber for Agy Driver
 * Strips client harness XML tags and irrelevant environmental metadata.
 */
const HARNESS_BLOCKS = [
    'guidelines',
    'memory_management',
    'commit_attribution',
    'tools',
    'custom_instructions',
];
/**
 * Strips client-internal XML wrapper blocks that trigger false-positive
 * prompt injection defenses in local agy/gemini models.
 */
export function scrubHarnessBlocks(text) {
    if (!text)
        return '';
    let result = text;
    for (const block of HARNESS_BLOCKS) {
        const regex = new RegExp(`<${block}[^>]*>[\\s\\S]*?<\\/${block}>`, 'gi');
        result = result.replace(regex, '');
    }
    // Remove solitary empty tags
    result = result.replace(/<\/?(?:guidelines|memory_management|commit_attribution|tools)[^>]*>/gi, '');
    return result.trim();
}
/**
 * Scrubs irrelevant environmental noise (timezone, OS headers) from prompts.
 */
export function scrubPromptMetadata(text) {
    if (!text)
        return '';
    let cleaned = text;
    // Scrub timezone and locale strings
    cleaned = cleaned.replace(/Current time:\s*[^\n]+/gi, '');
    cleaned = cleaned.replace(/User timezone:\s*[^\n]+/gi, '');
    cleaned = cleaned.replace(/OS Version:\s*[^\n]+/gi, '');
    // Collapse excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
}
/**
 * Master cleanup pipeline for incoming prompts.
 */
export function cleanPrompt(raw) {
    return scrubPromptMetadata(scrubHarnessBlocks(raw));
}
//# sourceMappingURL=prompt-scrubber.js.map