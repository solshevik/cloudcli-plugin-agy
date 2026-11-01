<div align="center">
  <img src="icon.svg" alt="Google Antigravity (agy)" width="72" height="72">
  <h1>cloudcli-plugin-agy</h1>
  <p><strong>Cloud-Agent / CloudCLI 官方本地 Google Antigravity (<code>agy</code>) 驱动与控制面板插件</strong></p>
</div>

<p align="center">
  <a href="https://github.com/solshevik/cloudcli-plugin-agy"><img src="https://img.shields.io/badge/Plugin-Agy_Driver-0066FF?style=for-the-badge&logo=github&logoColor=white" alt="插件"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange?style=for-the-badge" alt="开源协议"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English"></a>
</p>

---

## 🌟 插件特性与架构概述

`cloudcli-plugin-agy` 是专为 [Cloud-Agent](https://github.com/solshevik/cloud-agent)（CloudCLI）设计的本地执行驱动与可视化控制面板插件。它将本地操作系统中安装的 Google Antigravity（`agy`）命令行与系统的统一多协议 API 网关彻底解耦，提供**零外部端口占用**的高性能本地 AI 推理能力。

### 核心亮点
- **零外部端口依赖（Zero-Port Architecture）**：外部客户端（Claude Code CLI、Cursor、OpenAI SDK、浏览器 UI）一律连接宿主默认的 `3001` 网关端口，无需额外开启 3002 端口或配置防火墙规则。
- **智能 Harness XML 清洗**：自动剥离客户端注入的 500+ 行 XML 约束标签（`<guidelines>`、`<memory_management>`、`<tools>`）及环境时区元数据，彻底杜绝底层模型被误判为提示注入攻击。
- **上下文会话连续性维持**：内部持久化映射 `sessionId` 与本地 `agy --conversation` 唯一标识，保障多轮连续拟人化推理（10+ 轮事实无缝接续）。
- **流式即刻终结机制**：精准捕获 `event: result` 信号并立刻向客户端发送 `[DONE]` 标识，彻底根除响应结束后终端持续挂起卡顿的缺陷。
- **可视化 Tab 控制面板**：在工作区提供独立交互式管理面板，包含 CLI 路径探针、端到端延迟自测工具、模型矩阵与活跃会话管理。
- **Slash 命令与技能自动下发**：自动注入 `/agy` 快捷命令，向 Agent 提供 Antigravity 交互指南。

---

## 🚀 安装与使用指南

### 方式一：在 Cloud-Agent / CloudCLI Web 界面一键安装
1. 打开 Cloud-Agent 控制台（默认 `http://localhost:3001`）。
2. 点击左侧侧边栏进入 **Settings** ➔ **Plugins**。
3. 在 **Install Plugin** 输入框中粘贴本仓库地址：
   ```text
   https://github.com/solshevik/cloudcli-plugin-agy
   ```
4. 点击 **Install**。宿主将自动拉取、构建并启用插件。
5. 工作区顶部将自动出现 **Google Antigravity (agy)** 控制面板。

### 方式二：本地软链开发调试
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

## 📡 外部客户端接入方式

### Claude Code CLI 终端直连
Claude Code 无需任何特殊端口，直接通过 Cloud-Agent 统一网关进行调用：
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
export ANTHROPIC_API_KEY="sk-any-token"

# 启动 Claude Code
claude
```

### cURL 标准流式请求验证
```bash
curl -N http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -d '{
    "model": "agy/gemini-3.8-flash-low",
    "messages": [{"role": "user", "content": "用一句话解释相对论"}],
    "stream": true
  }'
```

---

## 🤖 支持的模型映射矩阵

| 模型请求标识 | 映射底层引擎 | 特性与适用场景 |
| :--- | :--- | :--- |
| `agy/gemini-3.8-flash-low` | Gemini 3.8 Flash (Low effort) | 极速首字出字（TTFT < 1s），适合通用问答 |
| `agy/gemini-3.8-flash-high` | Gemini 3.8 Flash (High effort) | 深度思考链、复杂逻辑推导与算法设计 |
| `agy/claude-sonnet-4-6` | Claude Sonnet 4.6 | 原生 Thinking 架构，高质量代码编写 |
| `agy/gpt-oss-120b-medium` | GPT-OSS 120B | 开源高能力模型，多语种与结构化推理 |

---

## 🧪 自动化测试与构建

```bash
# 执行单元测试
npm test

# 重新编译 TypeScript 产物
npm run build
```

---

## 📄 开源协议

GNU Affero General Public License v3.0 or later ([AGPL-3.0-or-later](LICENSE))。
