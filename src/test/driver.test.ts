import { test } from 'node:test';
import assert from 'node:assert';
import { scrubHarnessBlocks, scrubPromptMetadata, cleanPrompt } from '../prompt-scrubber.js';
import { SessionContinuityManager } from '../session-manager.js';
import { AgyDriver } from '../driver.js';

test('PromptScrubber: removes guidelines, tools, and harness blocks', () => {
  const input = `
<guidelines>
Never use markdown links.
Always respond in English.
</guidelines>
<tools>
tool: Bash
</tools>
Please write a python function to add two numbers.
`;
  const result = scrubHarnessBlocks(input);
  assert.ok(!result.includes('<guidelines>'), 'Must remove <guidelines>');
  assert.ok(!result.includes('<tools>'), 'Must remove <tools>');
  assert.ok(result.includes('Please write a python function to add two numbers.'), 'Must preserve user question');
});

test('PromptScrubber: removes environment metadata noise', () => {
  const input = `
Current time: 2026-11-01T04:20:00Z
User timezone: UTC+8
OS Version: Linux 6.8.0
What is the speed of light?
`;
  const result = cleanPrompt(input);
  assert.ok(!result.includes('Current time:'), 'Must remove Current time');
  assert.ok(!result.includes('User timezone:'), 'Must remove User timezone');
  assert.ok(result.includes('What is the speed of light?'), 'Must preserve user question');
});

test('SessionContinuityManager: tracks and reuses conversationId', () => {
  const mgr = new SessionContinuityManager();
  const res1 = mgr.getOrCreateConversationId('test-sess-1');
  const res2 = mgr.getOrCreateConversationId('test-sess-1');

  assert.strictEqual(res1.isNew, true);
  assert.strictEqual(res2.isNew, false);
  assert.strictEqual(res1.conversationId, res2.conversationId, 'Must reuse conversationId for same session');
});

test('AgyDriver: resolves model names and thinking budget', () => {
  const driver = new AgyDriver();
  assert.strictEqual(driver.resolveModelName('agy/gemini-3.8-flash-low'), 'gemini-3.8-flash-low');
  assert.strictEqual(driver.resolveModelName('agy/claude-sonnet-4-6'), 'claude-sonnet-4-6');
  assert.strictEqual(driver.resolveModelName('gemini-3.8-flash-high'), 'gemini-3.8-flash-high');
  assert.strictEqual(driver.resolveModelName('default', 4000), 'gemini-3.8-flash-high');
});
