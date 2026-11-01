/**
 * Google Antigravity (agy) Frontend Plugin Dashboard & Interactive Chat Console
 *
 * Implements mount(container, api) and unmount(container) lifecycle hooks.
 * Features an integrated interactive chat interface, multi-session management,
 * and precise environmental diagnostics.
 */
function getThemeTokens(dark) {
    return dark
        ? {
            bg: '#0D1117',
            sidebarBg: '#161B22',
            cardBg: '#161B22',
            border: '#30363D',
            text: '#F0F6FC',
            textMuted: '#8B949E',
            accent: '#58A6FF',
            accentHover: '#79B8FF',
            accentDim: 'rgba(56, 139, 253, 0.15)',
            userBubble: '#1F6FEB',
            userText: '#FFFFFF',
            assistantBubble: '#21262D',
            badgeBg: 'rgba(35, 134, 54, 0.2)',
            badgeText: '#3FB950',
            codeBg: '#090D13',
            inputBg: '#21262D',
        }
        : {
            bg: '#F6F8FA',
            sidebarBg: '#FFFFFF',
            cardBg: '#FFFFFF',
            border: '#D0D7DE',
            text: '#1F2328',
            textMuted: '#656D76',
            accent: '#0969DA',
            accentHover: '#0550AE',
            accentDim: 'rgba(9, 105, 218, 0.1)',
            userBubble: '#0969DA',
            userText: '#FFFFFF',
            assistantBubble: '#FFFFFF',
            badgeBg: '#DFF7DF',
            badgeText: '#1A7F37',
            codeBg: '#F3F4F6',
            inputBg: '#FFFFFF',
        };
}
export function mount(container, api) {
    const root = document.createElement('div');
    Object.assign(root.style, {
        height: '100%',
        width: '100%',
        display: 'flex',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    });
    container.appendChild(root);
    let currentStatus = null;
    let currentSessions = [];
    let activeSessionId = null;
    let selectedModel = 'gemini-3.8-flash-low';
    let isSending = false;
    let showDiagnostics = false;
    let diagnosticTestResult = null;
    let isRunningTest = false;
    async function loadInitialData() {
        try {
            const [statusRes, sessionsRes] = await Promise.all([
                api.rpc('GET', '/status'),
                api.rpc('GET', '/sessions'),
            ]);
            currentStatus = statusRes;
            currentSessions = sessionsRes.sessions || [];
            if (!activeSessionId && currentSessions.length > 0) {
                activeSessionId = currentSessions[0].sessionId;
            }
            render();
        }
        catch (err) {
            console.error('[AgyPlugin:UI] Failed to load data:', err);
            render(err.message);
        }
    }
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function formatMessageContent(content, t) {
        const escaped = escapeHtml(content);
        // Simple code block formatter
        return escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
            return `<pre style="background: ${t.codeBg}; border: 1px solid ${t.border}; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; font-family: monospace; font-size: 13px;"><code>${code}</code></pre>`;
        }).replace(/\n/g, '<br/>');
    }
    function render(errorMsg) {
        const isDark = api.context.theme === 'dark';
        const t = getThemeTokens(isDark);
        root.style.background = t.bg;
        root.style.color = t.text;
        if (errorMsg) {
            root.innerHTML = `
        <div style="padding: 32px; width: 100%; text-align: center;">
          <div style="background: rgba(248, 81, 73, 0.15); border: 1px solid #f85149; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto; color: #f85149;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">⚠️ 无法连接到 Agy 插件服务</h3>
            <p style="margin: 0; font-size: 13px;">${escapeHtml(errorMsg)}</p>
          </div>
        </div>
      `;
            return;
        }
        const installed = currentStatus?.installed ?? false;
        const activeSession = currentSessions.find((s) => s.sessionId === activeSessionId);
        const messages = activeSession?.messages || [];
        root.innerHTML = `
      <!-- Left Drawer: Sessions List -->
      <div style="width: 260px; height: 100%; border-right: 1px solid ${t.border}; background: ${t.sidebarBg}; display: flex; flex-direction: column; flex-shrink: 0;">
        
        <!-- New Session Header -->
        <div style="padding: 14px 16px; border-bottom: 1px solid ${t.border}; display: flex; align-items: center; justify-content: space-between;">
          <button id="agy-btn-new-session" style="cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${t.accent}; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; font-size: 13px; font-weight: 600;">
            <span>+</span> 新建会话
          </button>
        </div>

        <!-- Sessions List -->
        <div style="flex: 1; overflow-y: auto; padding: 8px;">
          ${currentSessions.length === 0
            ? `<div style="padding: 20px 12px; text-align: center; font-size: 12px; color: ${t.textMuted};">暂无历史会话</div>`
            : currentSessions
                .map((s) => {
                const isSelected = s.sessionId === activeSessionId;
                return `
                      <div class="agy-session-item" data-session-id="${s.sessionId}" style="cursor: pointer; margin-bottom: 4px; padding: 8px 10px; border-radius: 6px; background: ${isSelected ? t.accentDim : 'transparent'}; border: 1px solid ${isSelected ? t.accent : 'transparent'}; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: ${isSelected ? '600' : '400'}; color: ${isSelected ? t.accent : t.text}; flex: 1;" title="${escapeHtml(s.title)}">
                          ${escapeHtml(s.title || '新会话')}
                        </div>
                        <button class="agy-btn-delete-session" data-session-id="${s.sessionId}" title="删除会话" style="cursor: pointer; background: transparent; border: none; color: ${t.textMuted}; font-size: 12px; padding: 2px 4px; border-radius: 4px; opacity: 0.6;">
                          ✕
                        </button>
                      </div>
                    `;
            })
                .join('')}
        </div>

        <!-- Sidebar Footer -->
        <div style="padding: 12px; border-top: 1px solid ${t.border}; font-size: 11px; color: ${t.textMuted}; display: flex; justify-content: space-between; align-items: center;">
          <span>会话总数: ${currentSessions.length}</span>
          ${currentSessions.length > 0
            ? `<button id="agy-btn-clear-all" style="cursor: pointer; background: transparent; border: none; color: #f85149; font-size: 11px;">清空全部</button>`
            : ''}
        </div>
      </div>

      <!-- Right Main: Interactive Chat Room -->
      <div style="flex: 1; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: ${t.bg};">
        
        <!-- Chat Top Bar -->
        <div style="padding: 10px 20px; border-bottom: 1px solid ${t.border}; background: ${t.cardBg}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; background: ${installed ? t.badgeBg : 'rgba(248, 81, 73, 0.15)'}; color: ${installed ? t.badgeText : '#f85149'};">
              <span>●</span> ${installed ? 'Google Antigravity' : '未检测到 agy'}
            </span>
            <select id="agy-model-select" style="cursor: pointer; background: ${t.inputBg}; color: ${t.text}; border: 1px solid ${t.border}; border-radius: 6px; padding: 4px 8px; font-size: 12px; font-weight: 500;">
              <option value="gemini-3.8-flash-low" ${selectedModel === 'gemini-3.8-flash-low' ? 'selected' : ''}>gemini-3.8-flash-low (极速响应)</option>
              <option value="gemini-3.8-flash-high" ${selectedModel === 'gemini-3.8-flash-high' ? 'selected' : ''}>gemini-3.8-flash-high (深度思考)</option>
              <option value="claude-sonnet-4-6" ${selectedModel === 'claude-sonnet-4-6' ? 'selected' : ''}>claude-sonnet-4-6 (高阶代码)</option>
              <option value="gpt-oss-120b-medium" ${selectedModel === 'gpt-oss-120b-medium' ? 'selected' : ''}>gpt-oss-120b-medium (开源模型)</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="agy-btn-toggle-diag" style="cursor: pointer; padding: 4px 10px; font-size: 12px; border-radius: 6px; border: 1px solid ${t.border}; background: ${showDiagnostics ? t.accentDim : 'transparent'}; color: ${showDiagnostics ? t.accent : t.textMuted}; font-weight: 500;">
              ⚙️ 环境诊断
            </button>
          </div>
        </div>

        <!-- Optional Diagnostics Banner -->
        ${showDiagnostics
            ? `
          <div style="background: ${t.cardBg}; border-bottom: 1px solid ${t.border}; padding: 14px 20px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <strong>CLI 路径:</strong> <code style="font-family: monospace; background: ${t.codeBg}; padding: 2px 6px; border-radius: 4px;">${escapeHtml(currentStatus?.path || 'unknown')}</code>
                <span style="margin-left: 14px;"><strong>版本:</strong> ${escapeHtml(currentStatus?.version || 'N/A')}</span>
              </div>
              <button id="agy-btn-run-diag-test" ${isRunningTest ? 'disabled' : ''} style="cursor: pointer; padding: 4px 12px; border-radius: 4px; border: none; background: ${t.accent}; color: #fff; font-size: 11px; font-weight: 600;">
                ${isRunningTest ? '自测中...' : '发起基准自测'}
              </button>
            </div>
            ${diagnosticTestResult
                ? `
              <div style="margin-top: 8px; padding: 10px; border-radius: 6px; background: ${diagnosticTestResult.success ? t.badgeBg : 'rgba(248, 81, 73, 0.1)'}; border: 1px solid ${diagnosticTestResult.success ? t.badgeText : '#f85149'}; color: ${diagnosticTestResult.success ? t.badgeText : '#f85149'};">
                <div style="font-weight: 600;">${diagnosticTestResult.success ? `✓ 测试成功 (耗时 ${diagnosticTestResult.latencyMs}ms)` : `✗ 测试失败: ${escapeHtml(diagnosticTestResult.error || '')}`}</div>
                ${diagnosticTestResult.output ? `<div style="margin-top: 4px; font-family: monospace; color: ${t.text};">${escapeHtml(diagnosticTestResult.output)}</div>` : ''}
                ${diagnosticTestResult.diagnostics?.fixCommand
                    ? `<div style="margin-top: 6px; color: ${t.text}; font-size: 11px;">建议排查命令: <code style="background: ${t.codeBg}; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${escapeHtml(diagnosticTestResult.diagnostics.fixCommand)}</code></div>`
                    : ''}
              </div>
            `
                : ''}
          </div>
        `
            : ''}

        <!-- Messages Area -->
        <div id="agy-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          ${messages.length === 0
            ? `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: ${t.accentDim}; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px;">
                ⚡
              </div>
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">欢迎使用 Google Antigravity 对话工作台</h2>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: ${t.textMuted}; max-width: 440px; line-height: 1.5;">
                本地大模型原生执行引擎。支持会话多轮记忆接续、代码逻辑推演与极速流式响应。
              </p>
              
              <!-- Quick Prompt Suggestions -->
              <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 500px;">
                <button class="agy-quick-prompt" data-prompt="用一句话解释微积分的核心思想" style="cursor: pointer; padding: 8px 12px; border-radius: 6px; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text}; font-size: 12px;">
                  💡 用一句话解释微积分
                </button>
                <button class="agy-quick-prompt" data-prompt="请用 Python 实现一个快速排序算法" style="cursor: pointer; padding: 8px 12px; border-radius: 6px; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text}; font-size: 12px;">
                  🐍 Python 快速排序算法
                </button>
                <button class="agy-quick-prompt" data-prompt="帮我分析当前系统的负载与内存使用情况" style="cursor: pointer; padding: 8px 12px; border-radius: 6px; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text}; font-size: 12px;">
                  💻 系统状态与运维建议
                </button>
              </div>
            </div>
          `
            : messages
                .map((m) => {
                const isUser = m.role === 'user';
                return `
                  <div style="display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'};">
                    <div style="font-size: 11px; color: ${t.textMuted}; margin-bottom: 4px; padding: 0 4px;">
                      ${isUser ? '你' : `Google agy (${m.model || selectedModel})`}
                    </div>
                    <div style="max-width: 85%; padding: 12px 16px; border-radius: 10px; background: ${isUser ? t.userBubble : t.assistantBubble}; color: ${isUser ? t.userText : t.text}; border: ${isUser ? 'none' : `1px solid ${t.border}`}; font-size: 14px; line-height: 1.6; word-break: break-word;">
                      ${formatMessageContent(m.content, t)}
                    </div>
                  </div>
                `;
            })
                .join('')}
          ${isSending
            ? `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="font-size: 11px; color: ${t.textMuted}; margin-bottom: 4px; padding: 0 4px;">
                Google agy 思考中...
              </div>
              <div style="padding: 12px 16px; border-radius: 10px; background: ${t.assistantBubble}; border: 1px solid ${t.border}; font-size: 14px; color: ${t.textMuted};">
                <span class="agy-pulsing-dot">●</span> 正在调起本地推理引擎...
              </div>
            </div>
          `
            : ''}
        </div>

        <!-- Chat Input Bar -->
        <div style="padding: 16px 20px; border-top: 1px solid ${t.border}; background: ${t.cardBg}; flex-shrink: 0;">
          <div style="display: flex; gap: 10px; align-items: flex-end; border: 1px solid ${t.border}; border-radius: 8px; padding: 8px 12px; background: ${t.inputBg};">
            <textarea id="agy-chat-input" rows="2" placeholder="向本地 agy 提问... (Enter 发送, Shift+Enter 换行)" style="flex: 1; resize: none; border: none; background: transparent; color: ${t.text}; font-size: 14px; outline: none; line-height: 1.4; max-height: 120px;"></textarea>
            <button id="agy-btn-send" ${isSending ? 'disabled' : ''} style="cursor: ${isSending ? 'not-allowed' : 'pointer'}; padding: 8px 16px; border-radius: 6px; border: none; background: ${t.accent}; color: #fff; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              ${isSending ? '生成中...' : '发送'}
            </button>
          </div>
        </div>

      </div>
    `;
        // Auto-scroll messages to bottom
        const msgContainer = root.querySelector('#agy-messages-container');
        if (msgContainer) {
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
        // Attach Event Listeners
        bindEvents();
    }
    function bindEvents() {
        // New Session
        root.querySelector('#agy-btn-new-session')?.addEventListener('click', () => {
            activeSessionId = `session-${Date.now()}`;
            render();
        });
        // Switch Session
        root.querySelectorAll('.agy-session-item').forEach((el) => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('agy-btn-delete-session'))
                    return;
                const sId = el.getAttribute('data-session-id');
                if (sId) {
                    activeSessionId = sId;
                    render();
                }
            });
        });
        // Delete Single Session
        root.querySelectorAll('.agy-btn-delete-session').forEach((el) => {
            el.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sId = el.getAttribute('data-session-id');
                if (sId && confirm('确认删除该会话记录？')) {
                    await api.rpc('DELETE', `/sessions/${sId}`);
                    if (activeSessionId === sId)
                        activeSessionId = null;
                    loadInitialData();
                }
            });
        });
        // Clear All Sessions
        root.querySelector('#agy-btn-clear-all')?.addEventListener('click', async () => {
            if (confirm('确定要清空全部会话缓存吗？')) {
                await api.rpc('POST', '/sessions/clear');
                activeSessionId = null;
                loadInitialData();
            }
        });
        // Model Select
        root.querySelector('#agy-model-select')?.addEventListener('change', (e) => {
            selectedModel = e.target.value;
        });
        // Toggle Diagnostics
        root.querySelector('#agy-btn-toggle-diag')?.addEventListener('click', () => {
            showDiagnostics = !showDiagnostics;
            render();
        });
        // Run Diagnostic Test
        root.querySelector('#agy-btn-run-diag-test')?.addEventListener('click', async () => {
            isRunningTest = true;
            render();
            try {
                const res = (await api.rpc('POST', '/test'));
                diagnosticTestResult = res;
            }
            catch (err) {
                diagnosticTestResult = {
                    success: false,
                    error: err.message || '自测调用异常',
                    diagnostics: {
                        code: 'PROCESS_ERROR',
                        message: err.message,
                        fixCommand: 'which agy',
                    },
                };
            }
            finally {
                isRunningTest = false;
                render();
            }
        });
        // Quick Prompt Chips
        root.querySelectorAll('.agy-quick-prompt').forEach((el) => {
            el.addEventListener('click', () => {
                const prompt = el.getAttribute('data-prompt');
                if (prompt) {
                    sendMessage(prompt);
                }
            });
        });
        // Chat Input Enter Key
        const chatInput = root.querySelector('#agy-chat-input');
        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (text) {
                    sendMessage(text);
                }
            }
        });
        // Send Button
        root.querySelector('#agy-btn-send')?.addEventListener('click', () => {
            const text = chatInput?.value.trim();
            if (text) {
                sendMessage(text);
            }
        });
    }
    async function sendMessage(text) {
        if (isSending || !text)
            return;
        isSending = true;
        if (!activeSessionId) {
            activeSessionId = `session-${Date.now()}`;
        }
        // Immediately render user message
        let activeSession = currentSessions.find((s) => s.sessionId === activeSessionId);
        if (!activeSession) {
            activeSession = {
                sessionId: activeSessionId,
                conversationId: activeSessionId,
                title: text.length > 20 ? text.slice(0, 20) + '...' : text,
                lastActive: Date.now(),
                turnCount: 1,
                messages: [],
            };
            currentSessions.unshift(activeSession);
        }
        activeSession.messages.push({
            id: String(Date.now()),
            role: 'user',
            content: text,
            timestamp: Date.now(),
            model: selectedModel,
        });
        render();
        try {
            const res = (await api.rpc('POST', '/chat', {
                sessionId: activeSessionId,
                message: text,
                model: selectedModel,
            }));
            if (!res.success) {
                activeSession.messages.push({
                    id: String(Date.now()),
                    role: 'assistant',
                    content: `⚠️ 请求失败: ${res.error || '未知错误'}`,
                    timestamp: Date.now(),
                    model: selectedModel,
                });
            }
        }
        catch (err) {
            activeSession.messages.push({
                id: String(Date.now()),
                role: 'assistant',
                content: `⚠️ 发生异常: ${err.message || '网络或服务异常'}`,
                timestamp: Date.now(),
                model: selectedModel,
            });
        }
        finally {
            isSending = false;
            loadInitialData();
        }
    }
    loadInitialData();
    const unsubscribe = api.onContextChange(() => {
        render();
    });
    container._agyUnsubscribe = unsubscribe;
}
export function unmount(container) {
    if (typeof container._agyUnsubscribe === 'function') {
        container._agyUnsubscribe();
        delete container._agyUnsubscribe;
    }
    container.innerHTML = '';
}
//# sourceMappingURL=index.js.map