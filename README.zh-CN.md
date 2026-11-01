<div align="center">
  <img src="icon.svg" alt="Google Antigravity (agy)" width="72" height="72">
  <h1>Google Antigravity (agy) 驱动与控制面板插件</h1>
  <p>专为 <a href="https://github.com/solshevik/cloud-agent">Cloud-Agent</a>（CloudCLI UI）打造的本地模型执行驱动与工作区控制台插件</p>
</div>

<p align="center">
  <a href="https://github.com/solshevik/cloud-agent">Cloud-Agent 网关主仓库</a> · 
  <a href="https://github.com/solshevik/cloudcli-plugin-agy/issues">反馈问题</a> · 
  <a href="README.md">English Documentation</a>
</p>

<p align="center">
  <a href="https://github.com/solshevik/cloudcli-plugin-agy"><img src="https://img.shields.io/badge/Plugin-Agy_Driver-0066FF?style=for-the-badge&logo=github&logoColor=white" alt="插件"></a>
  <a href="https://github.com/solshevik/cloudcli-plugin-agy/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-brightgreen?style=for-the-badge" alt="版本号"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange?style=for-the-badge" alt="开源协议"></a>
</p>

---

## 🌟 核心功能与亮点

`cloudcli-plugin-agy` 实现了将本地操作系统中的 Google Antigravity（`agy`）命令行与宿主系统的彻底解耦，为 Cloud-Agent 赋予高性能的本地大模型执行驱动及全功能工作区控制面板：

- **⚡ 零外部端口架构（Zero-Port Gateway）**：外部客户端（Claude Code CLI、Cursor、OpenAI SDK 等）统一连接宿主原生 API 网关（默认 `http://127.0.0.1:3001`）。无需额外开放 3002 等外部网络端口或配置复杂防火墙规则，插件内部仅通过系统随机的本地回环地址（`127.0.0.1:0`）进行安全通信。
- **🛡️ 智能 Harness XML 约束剥离**：自动识别并剔除客户端内部注入的 500+ 行 XML 约束标签（`<guidelines>`、`<memory_management>`、`<commit_attribution>`、`<tools>`）与时区元数据，彻底杜绝底层 Gemini / Sonnet 等大模型因误判为提示注入攻击而拒答的情况。
- **🔄 会话连续性追踪映射**：自动在 `~/.claude-code-ui/agy-sessions.json` 中建立客户端 `sessionId` 与本地 `agy --conversation <convId>` 的双向映射，支持 10+ 轮拟人化上下文深度连续推理（代数运算、菜谱推导、历史事实记忆），永无上下文断联之忧。
- **⏱️ 流式即刻终结机制**：精准捕获 `agy` CLI 进程输出的 `event: result` 结束信号，并立刻向客户端发送 `[DONE]` 终止流，根除响应结束后终端持续挂起卡顿直达超时的缺陷。
- **📊 实时 Tab 可视化面板**：深度嵌入 Cloud-Agent 标签页体系，提供 CLI 本地探针、毫秒级端到端延迟基准自测工具、活跃会话监视器及一键清空重置操作。
- **💬 原生 Slash 技能支持 (`/agy`)**：安装后自动向主聊天输入框注册 `/agy` 斜杠命令与模型指南。

---

## 📐 运行架构图

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cloud-Agent 宿主系统 (Port 3001)                                      │
│                                                                        │
│  统一 API 网关: /v1/chat/completions 与 /v1/messages                   │
│    识别 "agy/*" 模型前缀并自动委派给插件内部 RPC                        │
│                                                                        │
│  插件子进程 (dist/server.js):                                          │
│    以操作系统受限子进程方式常驻                                         │
│    监听本地回环随机端口 (127.0.0.1:0)                                  │
│    10 秒内向标准输出完成就绪握手: {"ready": true, "port": <port>}       │
└───────────────────────┬────────────────────────┬───────────────────────┘
                        │ 提供前端静态资产       │ 代理内部 RPC 请求
┌───────────────────────▼────────────────────────▼───────────────────────┐
│  工作区 Web 浏览器前端                                                 │
│                                                                        │
│  前端 ES Module 模块 (dist/index.js)                                   │
│    mount(container, api) → 交互式可视化控制面板 Tab                     │
│    api.context           → 响应深浅色主题、当前工程及会话变更           │
│    api.rpc('GET', ...)   → 探针状态与延迟基准评测                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │ 启动 CLI 命令
                        ┌───────────▼───────────┐
                        │ 本地操作系统环境      │
                        │ agy 可执行命令行程序  │
                        └───────────────────────┘
```

---

## 🚀 安装部署指南

### 推荐：在 Cloud-Agent / CloudCLI Web 界面一键安装
1. 打开 Cloud-Agent 控制台（默认 `http://localhost:3001`）；
2. 进入 **Settings** ➔ **Plugins**（插件设置）；
3. 在 **Install Plugin** 文本框中粘贴本仓库地址：
   ```text
   https://github.com/solshevik/cloudcli-plugin-agy
   ```
4. 点击 **Install**。宿主将自动执行 Git 拉取、依赖校验、构建自检并完成启用；
5. 工作区顶部将自动出现 **Google Antigravity (agy)** 控制面板标签页。

### 本地开发者软链模式
```bash
# 1. 克隆代码仓库
git clone git@github.com:solshevik/cloudcli-plugin-agy.git /home/yubs/cloudcli-plugin-agy
cd /home/yubs/cloudcli-plugin-agy

# 2. 安装依赖并编译构建
npm install
npm run build

# 3. 软链至插件目录
mkdir -p ~/.claude-code-ui/plugins
ln -s /home/yubs/cloudcli-plugin-agy ~/.claude-code-ui/plugins/cloudcli-plugin-agy
```

---

## 💡 配合 Cloud-Agent 统一网关在外部客户端中使用

> [!NOTE]
> **架构边界明确澄清：**  
> 本插件是**纯粹的本地执行驱动（Backend Driver）**，**自身不包含、也不对外暴露 API 网关服务**。所有外部接口（如 `/v1/chat/completions`、`/v1/messages`、Token 鉴权等）均由 **Cloud-Agent 宿主系统（默认 3001 端口）** 统一提供。宿主网关在接收到模型前缀为 `agy/*` 的请求时，会在内部将执行任务委派给本插件驱动处理。

### 1. Claude Code CLI（通过 Cloud-Agent 宿主网关中转）
在终端中将环境变量配置为 Cloud-Agent 宿主网关地址：
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
export ANTHROPIC_API_KEY="sk-any-token"

# 启动 Claude Code，宿主网关将自动把流量委派给本地 agy 驱动
claude
```

### 2. cURL / OpenAI 协议调用（通过 Cloud-Agent 宿主网关）
```bash
curl -N http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -d '{
    "model": "agy/gemini-3.8-flash-low",
    "messages": [{"role": "user", "content": "用一句话解释微积分"}],
    "stream": true
  }'
```

---

## 🤖 支持的模型映射矩阵

| 模型标识 | 底层引擎映射 | 特点与适用场景 |
| :--- | :--- | :--- |
| `agy/gemini-3.8-flash-low` | Gemini 3.8 Flash (Low effort) | 极致首字出字速度（TTFT < 1s），适合通用问答与代码补齐 |
| `agy/gemini-3.8-flash-high` | Gemini 3.8 Flash (High effort) | 深度推理强化，适合复杂逻辑推导、算法分析与架构设计 |
| `agy/claude-sonnet-4-6` | Claude Sonnet 4.6 | 原生 Thinking 能力，高质量编程与结构化输出 |
| `agy/gpt-oss-120b-medium` | GPT-OSS 120B | 开源大参数量模型，优秀的复杂文本推导能力 |

---

## 📂 插件目录结构

```text
cloudcli-plugin-agy/
├── manifest.json              # 【必选】插件核心清单描述文件
├── package.json               # 项目依赖与自适应构建配置
├── tsconfig.json              # TypeScript 编译配置
├── icon.svg                   # 高清矢量 Antigravity 图标
├── README.md                  # 英文说明文档
├── README.zh-CN.md            # 中文说明文档
├── scripts/
│   └── build.js               # 具备弹性回退能力的自适应构建脚本
├── skills/
│   └── agy.md                 # Agent 技能文件与 /agy 快捷命令
├── src/
│   ├── types.ts               # 宿主 PluginAPI 与网关数据接口声明
│   ├── index.ts               # 前端 Tab 挂载入口 (mount / unmount)
│   ├── server.ts              # 后端内部回环 RPC 服务 (127.0.0.1:0)
│   ├── driver.ts              # agy CLI 进程调度与 SSE 流解析核心
│   ├── prompt-scrubber.ts     # XML Harness 与时区元数据清洗工具
│   ├── session-manager.ts     # 多轮对话会话连续性维持与持久化
│   └── test/
│       └── driver.test.ts     # 全套自动化单元测试
└── dist/                      # 编译后的生产代码产物 (随 Git 托管)
    ├── index.js               # 前端 ESM 产物 (由 manifest entry 指向)
    ├── server.js              # 后端服务产物 (由 manifest server 指向)
    └── driver.js              # 纯内存直接导入的通用驱动类
```

---

## ⚙️ manifest.json 配置解析

```jsonc
{
  "name": "cloudcli-plugin-agy",
  "displayName": "Google Antigravity (agy)",
  "version": "1.0.0",
  "description": "Local Google Antigravity (agy) execution driver and control dashboard for Cloud-Agent / CloudCLI",
  "icon": "icon.svg",
  "type": "module",              // 必须为 module (原生 ESM)
  "slot": "tab",                 // 挂载插槽: 工作区主标签页
  "entry": "dist/index.js",      // 前端产物相对路径
  "server": "dist/server.js",    // 后端子进程服务相对路径
  "permissions": ["network", "storage"],
  "repository": "https://github.com/solshevik/cloudcli-plugin-agy"
}
```

---

## 🔒 安全性与隔离模型

- **操作系统级子进程隔离**：后端服务作为独立子进程启动，仅具备最小运行环境变量（`PATH`、`HOME`、`NODE_ENV`、`PLUGIN_NAME`），严防宿主环境变量泄露。
- **纯本地回环监听**：服务仅监听 `127.0.0.1:0`，对外部网络完全不可见，宿主通过安全反向代理执行鉴权转发。
- **无状态密钥注入**：密钥由宿主在 RPC 转发时按需注入 `X-Plugin-Secret-*` 头部，不落盘、不写入子进程环境变量。
- **输入过滤防注入**：剥离客户端脚手架注入指令，确保本地模型响应符合用户真实意图。

---

## 🧪 自动化测试与构建

```bash
# 运行单元测试
npm test

# 重新编译 TypeScript 代码
npm run build
```

---

## 📄 开源协议

GNU Affero General Public License v3.0 or later ([AGPL-3.0-or-later](LICENSE))。
