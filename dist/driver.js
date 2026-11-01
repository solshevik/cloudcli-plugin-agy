/**
 * Core Google Antigravity (agy) Local Process Driver
 *
 * Handles CLI binary detection, version probing, prompt cleaning,
 * session continuity parameter mapping, and stream-json event parsing.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { cleanPrompt } from './prompt-scrubber.js';
import { sessionManager } from './session-manager.js';
const SUPPORTED_MODELS = [
    'gemini-3.8-flash-low',
    'gemini-3.8-flash-medium',
    'gemini-3.8-flash-high',
    'claude-sonnet-4-6',
    'gpt-oss-120b-medium',
];
export class AgyDriver {
    cachedAgyPath = null;
    /**
     * Resolves the absolute path to the local agy executable.
     */
    resolveAgyPath() {
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
        ].filter(Boolean);
        for (const p of candidatePaths) {
            try {
                if (p === 'agy') {
                    return p;
                }
                if (fs.existsSync(p)) {
                    this.cachedAgyPath = p;
                    return p;
                }
            }
            catch {
                // continue search
            }
        }
        return 'agy';
    }
    /**
     * Probes system for agy CLI status, version, and diagnostic health.
     */
    async getStatus() {
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
                let diagnostics;
                if (!isInstalled) {
                    diagnostics = {
                        code: 'CLI_NOT_FOUND',
                        message: `未在服务器环境中找到可用的 agy 命令行程序。`,
                        details: stderr || '执行 agy --version 退出码非 0',
                        fixCommand: 'which agy || export PATH="$HOME/.local/bin:$PATH"',
                    };
                }
                else if (stderr.toLowerCase().includes('auth') || stderr.toLowerCase().includes('login')) {
                    diagnostics = {
                        code: 'AUTH_REQUIRED',
                        message: 'agy CLI 尚未登录认证。',
                        details: stderr,
                        fixCommand: 'agy auth',
                    };
                }
                else {
                    diagnostics = {
                        code: 'HEALTHY',
                        message: '引擎已就绪，状态正常。',
                    };
                }
                resolve({
                    installed: isInstalled,
                    version: isInstalled ? version : 'Not Found',
                    path: agyPath,
                    supportedModels: SUPPORTED_MODELS,
                    activeSessions,
                    diagnostics,
                });
            });
            proc.on('error', (err) => {
                resolve({
                    installed: false,
                    version: 'Not Found',
                    path: agyPath,
                    supportedModels: SUPPORTED_MODELS,
                    activeSessions: 0,
                    diagnostics: {
                        code: 'CLI_NOT_FOUND',
                        message: `无法启动 agy 进程: ${err.message}`,
                        details: `系统找不到指定路径: ${agyPath}。请确认本地是否已安装 agy。`,
                        fixCommand: 'export PATH="$HOME/.local/bin:$PATH"',
                    },
                });
            });
        });
    }
    /**
     * Resolves target model name, mapping requested models or thinkingBudget.
     */
    resolveModelName(requestedModel, thinkingBudget) {
        if (!requestedModel)
            return 'gemini-3.8-flash-low';
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
    extractPrompt(messages) {
        if (!messages || messages.length === 0)
            return '';
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
    async *executeChat(request) {
        const agyPath = this.resolveAgyPath();
        const model = this.resolveModelName(request.model, request.thinkingBudget);
        const prompt = this.extractPrompt(request.messages);
        const { conversationId } = sessionManager.getOrCreateConversationId(request.sessionId, prompt);
        const args = [
            '-p', prompt,
            '--model', model,
            '--output-format', 'stream-json',
            '--dangerously-skip-permissions',
            '--disable-slash-commands',
        ];
        if (conversationId) {
            args.unshift('--conversation', conversationId);
        }
        const child = spawn(agyPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NO_COLOR: '1',
                FORCE_COLOR: '0',
            },
        });
        let buffer = '';
        let hasEmittedChunk = false;
        let accumulatedText = '';
        let accumulatedStderr = '';
        const queue = [];
        let notify = null;
        const push = (item) => {
            queue.push(item);
            if (notify) {
                notify();
                notify = null;
            }
        };
        child.stdout.on('data', (data) => {
            buffer += data.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('{'))
                    continue;
                try {
                    const event = JSON.parse(trimmed);
                    // Handle step update text delta
                    if (event.event === 'step_update' && event.step_update) {
                        const su = event.step_update;
                        if (su.step_type === 'agent_response' && su.text_delta) {
                            hasEmittedChunk = true;
                            accumulatedText += su.text_delta;
                            push({ chunk: { type: 'text', content: su.text_delta } });
                        }
                    }
                    else if (event.event === 'result' && event.result) {
                        if (event.result.status === 'ERROR') {
                            push({ error: new Error(event.result.error || 'agy execution error') });
                            return;
                        }
                        else {
                            if (!hasEmittedChunk && event.result.response) {
                                hasEmittedChunk = true;
                                accumulatedText += event.result.response;
                                push({ chunk: { type: 'text', content: event.result.response } });
                            }
                            push({ chunk: { type: 'done', content: '', isFinished: true } });
                        }
                    }
                }
                catch {
                    // ignore non-json line
                }
            }
        });
        child.stderr.on('data', (d) => {
            accumulatedStderr += d.toString();
        });
        child.on('close', (code) => {
            if (code !== 0 && !hasEmittedChunk) {
                const errDetail = accumulatedStderr.trim() || `exit code ${code}`;
                let humanMessage = `agy 执行失败: ${errDetail}`;
                if (errDetail.toLowerCase().includes('auth') || errDetail.toLowerCase().includes('login')) {
                    humanMessage = `agy CLI 尚未登录认证。请登录服务器终端执行 "agy auth" 完成认证后再试。`;
                }
                else if (errDetail.toLowerCase().includes('invalid model')) {
                    humanMessage = `模型选择冲突: ${errDetail}。请切换为 gemini-3.8-flash-low 或 claude-sonnet-4-6 重试。`;
                }
                push({ error: new Error(humanMessage) });
                return;
            }
            // If 0 chunks were emitted (fallback mechanism)
            if (!hasEmittedChunk && !accumulatedText) {
                push({ chunk: { type: 'text', content: 'Turn completed.' } });
            }
            push({ done: true });
        });
        child.on('error', (err) => {
            if (err.code === 'ENOENT') {
                push({
                    error: new Error(`未找到 agy 命令: 系统找不到路径 "${agyPath}"。请确认该服务器已安装 Google Antigravity 并将其加入 PATH。`),
                });
            }
            else {
                push({ error: new Error(`启动 agy 失败: ${err.message}`) });
            }
        });
        while (true) {
            if (queue.length === 0) {
                await new Promise((r) => { notify = r; });
            }
            const item = queue.shift();
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
//# sourceMappingURL=driver.js.map