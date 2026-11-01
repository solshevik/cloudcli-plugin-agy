/**
 * Google Antigravity (agy) Frontend Plugin Dashboard
 *
 * Implements mount(container, api) and unmount(container) lifecycle hooks.
 * Dynamically adapts to host dark/light themes and project/session context.
 */
function getThemeTokens(dark) {
    return dark
        ? {
            bg: '#0D1117',
            cardBg: '#161B22',
            border: '#30363D',
            text: '#F0F6FC',
            textMuted: '#8B949E',
            accent: '#58A6FF',
            accentDim: 'rgba(56, 139, 253, 0.15)',
            badgeBg: 'rgba(35, 134, 54, 0.2)',
            badgeText: '#3FB950',
            codeBg: '#090D13',
        }
        : {
            bg: '#F6F8FA',
            cardBg: '#FFFFFF',
            border: '#D0D7DE',
            text: '#1F2328',
            textMuted: '#656D76',
            accent: '#0969DA',
            accentDim: 'rgba(9, 105, 218, 0.1)',
            badgeBg: '#DFF7DF',
            badgeText: '#1A7F37',
            codeBg: '#F3F4F6',
        };
}
export function mount(container, api) {
    const root = document.createElement('div');
    Object.assign(root.style, {
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    });
    container.appendChild(root);
    let currentStatus = null;
    let currentSessions = [];
    let testLoading = false;
    let testResult = null;
    async function fetchData() {
        try {
            const [statusRes, sessionsRes] = await Promise.all([
                api.rpc('GET', '/status'),
                api.rpc('GET', '/sessions'),
            ]);
            currentStatus = statusRes;
            currentSessions = sessionsRes.sessions || [];
            render(api.context);
        }
        catch (err) {
            console.error('[AgyPlugin:Dashboard] Failed to fetch status:', err);
            render(api.context, err.message);
        }
    }
    function render(ctx, errorMsg) {
        const isDark = ctx.theme === 'dark';
        const t = getThemeTokens(isDark);
        root.style.background = t.bg;
        root.style.color = t.text;
        if (errorMsg) {
            root.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
          <div style="background: rgba(248, 81, 73, 0.15); border: 1px solid #f85149; border-radius: 8px; padding: 16px; color: #f85149;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">⚠️ 连接 Agy 驱动服务失败</h3>
            <p style="margin: 0; font-size: 14px;">${errorMsg}</p>
          </div>
        </div>
      `;
            return;
        }
        const installed = currentStatus?.installed ?? false;
        const version = currentStatus?.version ?? 'Checking...';
        const agyPath = currentStatus?.path ?? 'Unknown';
        const models = currentStatus?.supportedModels ?? [];
        root.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${t.border}; padding-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: ${t.accentDim}; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              ⚡
            </div>
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Google Antigravity (agy) 驱动控制台</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: ${t.textMuted};">本地模型推理引擎、元数据清洗与会话连续性维持</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: ${installed ? t.badgeBg : 'rgba(248, 81, 73, 0.2)'}; color: ${installed ? t.badgeText : '#f85149'};">
              ${installed ? '● 引擎已就绪 (Active)' : '○ 未检测到 CLI'}
            </span>
            <button id="agy-btn-refresh" style="cursor: pointer; padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid ${t.border}; background: ${t.cardBg}; color: ${t.text}; font-weight: 500;">
              刷新状态
            </button>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">CLI 核心版本</div>
            <div style="font-size: 16px; font-weight: 600; margin-top: 6px; font-family: monospace;">${version}</div>
          </div>
          <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">可执行文件路径</div>
            <div style="font-size: 13px; font-weight: 500; margin-top: 6px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${agyPath}">${agyPath}</div>
          </div>
          <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">活跃上下文会话</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 6px; color: ${t.accent};">${currentSessions.length} 个</div>
          </div>
          <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">默认模型</div>
            <div style="font-size: 14px; font-weight: 600; margin-top: 6px; color: ${t.accent};">gemini-3.8-flash-low</div>
          </div>
        </div>

        <!-- Interactive Benchmark Test Card -->
        <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 600;">⚡ 本地延迟基准自测</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: ${t.textMuted};">向本地 agy 发送测试指令，检验进程调度与首字延迟 (TTFT)</p>
            </div>
            <button id="agy-btn-run-test" ${testLoading ? 'disabled' : ''} style="cursor: ${testLoading ? 'not-allowed' : 'pointer'}; padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 6px; border: none; background: ${t.accent}; color: #fff;">
              ${testLoading ? '测试执行中...' : '发起自测'}
            </button>
          </div>
          ${testResult
            ? `
            <div style="margin-top: 12px; background: ${t.codeBg}; border: 1px solid ${t.border}; border-radius: 6px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: ${t.textMuted}; margin-bottom: 6px;">
                <span>输出结果</span>
                <span style="color: ${t.accent}; font-weight: 600;">端到端耗时: ${testResult.latencyMs} ms</span>
              </div>
              <div style="font-size: 13px; font-family: monospace; white-space: pre-wrap;">${testResult.output}</div>
            </div>
          `
            : ''}
        </div>

        <!-- Supported Models Matrix -->
        <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 18px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">🤖 支持的模型矩阵</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${models
            .map((m) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.codeBg};">
                <span style="font-size: 13px; font-family: monospace; font-weight: 600;">agy/${m}</span>
                <span style="font-size: 11px; color: ${t.textMuted};">
                  ${m.includes('high') ? '深度思考 (Deep Reasoning)' : m.includes('claude') ? 'Claude Sonnet 架构' : '低延迟极速响应'}
                </span>
              </div>
            `)
            .join('')}
          </div>
        </div>

        <!-- Sessions Inspector Card -->
        <div style="background: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 600;">💾 会话连续性映射器 (Session Continuity)</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: ${t.textMuted};">记录客户端 Session 与本地 agy --conversation 对应关系</p>
            </div>
            ${currentSessions.length > 0
            ? `
              <button id="agy-btn-clear-sessions" style="cursor: pointer; padding: 4px 10px; font-size: 11px; border-radius: 4px; border: 1px solid ${t.border}; background: transparent; color: #f85149;">
                清空会话缓存
              </button>
            `
            : ''}
          </div>
          ${currentSessions.length === 0
            ? `<div style="font-size: 12px; color: ${t.textMuted}; padding: 12px 0;">当前暂无缓存的会话记录。发起对话后将自动在此呈现。</div>`
            : `
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="border-bottom: 1px solid ${t.border}; text-align: left; color: ${t.textMuted};">
                    <th style="padding: 6px 8px;">客户端 Session ID</th>
                    <th style="padding: 6px 8px;">Agy Conversation ID</th>
                    <th style="padding: 6px 8px;">问答轮次</th>
                    <th style="padding: 6px 8px;">最近活跃</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentSessions
                .map((s) => `
                    <tr style="border-bottom: 1px solid ${t.border};">
                      <td style="padding: 6px 8px; font-family: monospace;">${s.sessionId}</td>
                      <td style="padding: 6px 8px; font-family: monospace; color: ${t.accent};">${s.conversationId}</td>
                      <td style="padding: 6px 8px;">${s.turnCount} 次</td>
                      <td style="padding: 6px 8px; color: ${t.textMuted};">${new Date(s.lastActive).toLocaleTimeString()}</td>
                    </tr>
                  `)
                .join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Zero-Port Architecture Tip -->
        <div style="background: ${t.accentDim}; border: 1px solid ${t.border}; border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${t.accent};">💡 统一网关零端口集成说明</h4>
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${t.text};">
            本插件遵循<strong>驱动与网关解耦架构</strong>。外部客户端（Claude Code CLI、Cursor、OpenAI SDK）<strong>无需额外配置新端口</strong>，直接访问 Cloud-Agent 默认的 <code>http://127.0.0.1:3001/v1/messages</code> 并指定模型为 <code>agy/gemini-3.8-flash-low</code>，网关将全自动委托本驱动执行。
          </p>
        </div>

      </div>
    `;
        // Bind Event Listeners
        root.querySelector('#agy-btn-refresh')?.addEventListener('click', () => {
            fetchData();
        });
        root.querySelector('#agy-btn-clear-sessions')?.addEventListener('click', async () => {
            try {
                await api.rpc('POST', '/sessions/clear');
                fetchData();
            }
            catch (e) {
                alert('清空失败: ' + e.message);
            }
        });
        root.querySelector('#agy-btn-run-test')?.addEventListener('click', async () => {
            testLoading = true;
            render(api.context);
            try {
                const res = (await api.rpc('POST', '/test'));
                testResult = res;
            }
            catch (err) {
                testResult = { output: '测试错误: ' + err.message, latencyMs: 0 };
            }
            finally {
                testLoading = false;
                render(api.context);
            }
        });
    }
    fetchData();
    const unsubscribe = api.onContextChange((ctx) => {
        render(ctx);
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