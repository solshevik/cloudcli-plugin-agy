/**
 * Core Google Antigravity (agy) Local Process Driver
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { cleanPrompt } from './prompt-scrubber.js';
import { sessionManager } from './session-manager.js';
import type { AgyStatus, UnifiedChatRequest, UnifiedChunk } from './types.js';

const SUPPORTED_MODELS = [
  'gemini-3.8-flash-low',
  'gemini-3.8-flash-medium',
  'gemini-3.8-flash-high',
  'claude-sonnet-4-6',
  'gpt-oss-120b-medium',
];

export class AgyDriver {
  private cachedAgyPath: string | null = null;

  /**
   * Resolves the absolute path to the local agy executable.
   */
  public resolveAgyPath(): string {
    if (this.cachedAgyPath && fs.existsSync(this.cachedAgyPath)) {
      return this.cachedAgyPath;
    }

    const home = os.homedir();
    const candidatePaths = [
      process.env.AGY_PATH,
      path.join(home, '.local', 'bin', 'agy'),
      '/usr/local/bin/agy',
      '/usr/bin/agy',
      'agy',
    ].filter(Boolean) as string[];

    for (const p of candidatePaths) {
      try {
        if (p === 'agy') {
          return p;
        }
        if (fs.existsSync(p)) {
          this.cachedAgyPath = p;
          return p;
        }
      } catch {
        // continue search
      }
    }

    return 'agy';
  }

  /**
   * Probes system for agy CLI status and version.
   */
  public async getStatus(): Promise<AgyStatus> {
    const agyPath = this.resolveAgyPath();
    const activeSessions = sessionManager.listSessions().length;

    return new Promise((resolve) => {
      const proc = spawn(agyPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        const isInstalled = code === 0 || stdout.length > 0;
        const version = (stdout || stderr || 'unknown').trim().split('\n')[0];
        resolve({
          installed: isInstalled,
          version: isInstalled ? version : 'Not Found',
          path: agyPath,
          supportedModels: SUPPORTED_MODELS,
          activeSessions,
        });
      });

      proc.on('error', () => {
        resolve({
          installed: false,
          version: 'Not Found',
          path: agyPath,
          supportedModels: SUPPORTED_MODELS,
          activeSessions: 0,
        });
      });
    });
  }

  /**
   * Resolves target model name, mapping requested models or thinkingBudget.
   */
  public resolveModelName(requestedModel?: string, thinkingBudget?: number): string {
    if (!requestedModel) return 'gemini-3.8-flash-low';
    const clean = requestedModel.replace(/^agy\//, '').trim();

    if (SUPPORTED_MODELS.includes(clean)) {
      return clean;
    }

    if (thinkingBudget && thinkingBudget > 1024) {
      return 'gemini-3.8-flash-high';
    }

    if (clean.includes('claude') || clean.includes('sonnet')) {
      return 'claude-sonnet-4-6';
    }

    return 'gemini-3.8-flash-low';
  }

  /**
   * Formats unified chat messages into a clean single prompt turn for agy CLI.
   */
  public extractPrompt(messages: UnifiedChatRequest['messages']): string {
    if (!messages || messages.length === 0) return '';

    // Find the latest user message
    let lastUserMessage = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const c = messages[i].content;
        lastUserMessage = typeof c === 'string' ? c : JSON.stringify(c);
        break;
      }
    }

    // Clean client harness and environment noise
    return cleanPrompt(lastUserMessage || 'Hello');
  }

  /**
   * Executes a turn using the local agy CLI and yields streaming text chunks.
   */
  public async *executeChat(request: UnifiedChatRequest): AsyncIterable<UnifiedChunk> {
    const agyPath = this.resolveAgyPath();
    const model = this.resolveModelName(request.model, request.thinkingBudget);
    const prompt = this.extractPrompt(request.messages);

    const { conversationId } = sessionManager.getOrCreateConversationId(request.sessionId);

    const args = [
      '--conversation', conversationId,
      '--model', model,
      prompt,
    ];

    const child = spawn(agyPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    let buffer = '';
    let hasEmittedChunk = false;
    let accumulatedText = '';

    // Async queue pattern for yielding chunks
    type QueueItem = { chunk?: UnifiedChunk; done?: boolean; error?: Error };
    const queue: QueueItem[] = [];
    let notify: (() => void) | null = null;

    const push = (item: QueueItem) => {
      queue.push(item);
      if (notify) {
        notify();
        notify = null;
      }
    };

    child.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Process SSE formatted line
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(payload);
            const text = parsed.text || parsed.delta?.text || parsed.content || '';
            if (text) {
              hasEmittedChunk = true;
              accumulatedText += text;
              push({ chunk: { type: 'text', content: text } });
            }
          } catch {
            if (payload && payload !== '[DONE]') {
              hasEmittedChunk = true;
              accumulatedText += payload;
              push({ chunk: { type: 'text', content: payload } });
            }
          }
        } else if (trimmed.startsWith('event: result')) {
          // Immediately close upon result event to prevent stream hanging
          push({ chunk: { type: 'done', content: '', isFinished: true } });
        }
      }
    });

    child.stderr.on('data', (d) => {
      const errText = d.toString();
      // Only log genuine errors, not progress logs
      if (errText.includes('ERROR') || errText.includes('Exception')) {
        console.error('[AgyPlugin:CLI stderr]:', errText);
      }
    });

    child.on('close', (code) => {
      if (code !== 0 && !hasEmittedChunk) {
        push({ error: new Error(`agy CLI exited with code ${code}`) });
        return;
      }

      // If buffer still has remaining text
      if (buffer.trim()) {
        const remaining = buffer.replace(/^data:\s*/, '').trim();
        if (remaining && remaining !== '[DONE]') {
          push({ chunk: { type: 'text', content: remaining } });
        }
      }

      // If 0 chunks were emitted (fallback mechanism)
      if (!hasEmittedChunk && !accumulatedText) {
        push({ chunk: { type: 'text', content: 'Turn completed.' } });
      }

      push({ done: true });
    });

    child.on('error', (err) => {
      push({ error: err });
    });

    while (true) {
      if (queue.length === 0) {
        await new Promise<void>((r) => { notify = r; });
      }

      const item = queue.shift()!;
      if (item.error) {
        throw item.error;
      }
      if (item.chunk) {
        yield item.chunk;
      }
      if (item.done) {
        break;
      }
    }
  }
}

export const agyDriver = new AgyDriver();
