/**
 * Plugin Backend Server
 *
 * Runs as a child process managed by Cloud-Agent / CloudCLI host.
 * Listens on an internal loopback port (127.0.0.1:0) and outputs
 * {"ready": true, "port": <port>} to stdout within 10 seconds.
 */

import http from 'node:http';
import { agyDriver } from './driver.js';
import { sessionManager } from './session-manager.js';
import type { TestBenchmarkResult, UnifiedChatRequest } from './types.js';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-plugin-secret-*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  const readJsonBody = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (d) => { body += d.toString(); });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  };

  // 1. Health and Status Endpoint
  if (req.method === 'GET' && pathname === '/status') {
    res.setHeader('Content-Type', 'application/json');
    const status = await agyDriver.getStatus();
    res.end(JSON.stringify(status));
    return;
  }

  // 2. Models Endpoint
  if (req.method === 'GET' && pathname === '/models') {
    res.setHeader('Content-Type', 'application/json');
    const status = await agyDriver.getStatus();
    res.end(JSON.stringify({ models: status.supportedModels }));
    return;
  }

  // 3. Sessions List Endpoint
  if (req.method === 'GET' && pathname === '/sessions') {
    res.setHeader('Content-Type', 'application/json');
    const sessions = sessionManager.listSessions();
    res.end(JSON.stringify({ sessions }));
    return;
  }

  // 4. Single Session Details Endpoint (/sessions/:id)
  if (req.method === 'GET' && pathname.startsWith('/sessions/')) {
    const sessionId = pathname.slice('/sessions/'.length);
    res.setHeader('Content-Type', 'application/json');
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    res.end(JSON.stringify({ session }));
    return;
  }

  // 5. Delete Single Session Endpoint (DELETE /sessions/:id)
  if (req.method === 'DELETE' && pathname.startsWith('/sessions/')) {
    const sessionId = pathname.slice('/sessions/'.length);
    res.setHeader('Content-Type', 'application/json');
    const deleted = sessionManager.deleteSession(sessionId);
    res.end(JSON.stringify({ success: deleted }));
    return;
  }

  // 6. Clear All Sessions Cache Endpoint
  if (req.method === 'POST' && pathname === '/sessions/clear') {
    res.setHeader('Content-Type', 'application/json');
    sessionManager.clearSessions();
    res.end(JSON.stringify({ success: true, message: 'All sessions cleared' }));
    return;
  }

  // 7. Test Benchmark Endpoint (Guaranteed HTTP 200 with structured diagnostics)
  if (req.method === 'POST' && pathname === '/test') {
    res.setHeader('Content-Type', 'application/json');
    const startTime = Date.now();
    try {
      const status = await agyDriver.getStatus();
      if (!status.installed) {
        const result: TestBenchmarkResult = {
          success: false,
          error: status.diagnostics?.message || '本地未检测到 agy CLI',
          diagnostics: status.diagnostics,
        };
        res.end(JSON.stringify(result));
        return;
      }

      let output = '';
      for await (const chunk of agyDriver.executeChat({
        model: 'gemini-3.8-flash-low',
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
      })) {
        output += chunk.content;
      }
      const latencyMs = Date.now() - startTime;
      const result: TestBenchmarkResult = {
        success: true,
        latencyMs,
        output: output.trim(),
      };
      res.end(JSON.stringify(result));
    } catch (err: any) {
      const errMsg = err.message || String(err);
      const result: TestBenchmarkResult = {
        success: false,
        error: errMsg,
        diagnostics: {
          code: errMsg.includes('未找到') ? 'CLI_NOT_FOUND' : errMsg.includes('auth') ? 'AUTH_REQUIRED' : 'PROCESS_ERROR',
          message: errMsg,
          fixCommand: errMsg.includes('auth') ? 'agy auth' : 'export PATH="$HOME/.local/bin:$PATH"',
        },
      };
      res.end(JSON.stringify(result));
    }
    return;
  }

  // 8. Interactive Chat Endpoint (/chat)
  if (req.method === 'POST' && pathname === '/chat') {
    res.setHeader('Content-Type', 'application/json');
    try {
      const body = await readJsonBody();
      const userContent = String(body.message || '').trim();
      const model = String(body.model || 'gemini-3.8-flash-low');
      const sessionId = body.sessionId || `session-${Date.now()}`;

      if (!userContent) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Message content cannot be empty' }));
        return;
      }

      // Record User message
      sessionManager.addMessage(sessionId, {
        role: 'user',
        content: userContent,
        model,
      });

      const startTime = Date.now();
      let assistantReply = '';

      for await (const chunk of agyDriver.executeChat({
        model,
        messages: [{ role: 'user', content: userContent }],
        sessionId,
      })) {
        assistantReply += chunk.content;
      }

      // Record Assistant message
      const assistantMsg = sessionManager.addMessage(sessionId, {
        role: 'assistant',
        content: assistantReply.trim(),
        model,
      });

      const latencyMs = Date.now() - startTime;
      res.end(JSON.stringify({
        success: true,
        sessionId,
        message: assistantMsg,
        latencyMs,
      }));
    } catch (err: any) {
      res.end(JSON.stringify({
        success: false,
        error: err.message || String(err),
      }));
    }
    return;
  }

  // 9. Unified Model Streaming Execution Endpoint (/execute)
  if (req.method === 'POST' && pathname === '/execute') {
    let body = '';
    req.on('data', (d) => { body += d.toString(); });
    req.on('end', async () => {
      try {
        const payload: UnifiedChatRequest = JSON.parse(body || '{}');

        // Stream as SSE format
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        for await (const chunk of agyDriver.executeChat(payload)) {
          if (chunk.content) {
            res.write(`data: ${JSON.stringify({ text: chunk.content })}\n\n`);
          }
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (err: any) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        }
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// Bind to random unused loopback port (port: 0)
server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  if (addr && typeof addr !== 'string') {
    // 【Required Host Handshake】: output single JSON line to stdout
    console.log(JSON.stringify({ ready: true, port: addr.port }));
  }
});
