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
    // 3. Sessions Inspection Endpoint
    if (req.method === 'GET' && pathname === '/sessions') {
        res.setHeader('Content-Type', 'application/json');
        const sessions = sessionManager.listSessions();
        res.end(JSON.stringify({ sessions }));
        return;
    }
    // 4. Clear Sessions Cache Endpoint
    if (req.method === 'POST' && pathname === '/sessions/clear') {
        res.setHeader('Content-Type', 'application/json');
        sessionManager.clearSessions();
        res.end(JSON.stringify({ success: true, message: 'Sessions cleared' }));
        return;
    }
    // 5. Test Benchmark Endpoint
    if (req.method === 'POST' && pathname === '/test') {
        res.setHeader('Content-Type', 'application/json');
        const startTime = Date.now();
        try {
            let output = '';
            for await (const chunk of agyDriver.executeChat({
                model: 'gemini-3.8-flash-low',
                messages: [{ role: 'user', content: 'Say hello in 3 words' }],
            })) {
                output += chunk.content;
            }
            const latencyMs = Date.now() - startTime;
            res.end(JSON.stringify({ success: true, latencyMs, output: output.trim() }));
        }
        catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }
    // 6. Unified Model Execution Endpoint (called by Gateway or internal RPC)
    if (req.method === 'POST' && pathname === '/execute') {
        let body = '';
        req.on('data', (d) => { body += d.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
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
            }
            catch (err) {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
                else {
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
//# sourceMappingURL=server.js.map