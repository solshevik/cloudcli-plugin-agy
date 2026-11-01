<div align="center">
  <img src="icon.svg" alt="Google Antigravity (agy)" width="72" height="72">
  <h1>cloudcli-plugin-agy</h1>
  <p><strong>Official Local Google Antigravity (<code>agy</code>) Driver & Control Dashboard for Cloud-Agent / CloudCLI</strong></p>
</div>

<p align="center">
  <a href="https://github.com/solshevik/cloudcli-plugin-agy"><img src="https://img.shields.io/badge/Plugin-Agy_Driver-0066FF?style=for-the-badge&logo=github&logoColor=white" alt="Plugin"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange?style=for-the-badge" alt="License"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/Language-简体中文-brightgreen?style=for-the-badge" alt="Chinese"></a>
</p>

---

## 🌟 Overview

`cloudcli-plugin-agy` is a decoupled, zero-external-port local driver plugin for [Cloud-Agent](https://github.com/solshevik/cloud-agent) (CloudCLI). It bridges the local Google Antigravity (`agy`) CLI into the unified Multi-Protocol LLM API Gateway and provides an interactive management dashboard inside the workspace.

### Core Features
- **Zero External Port Configuration**: External clients (Claude Code CLI, Cursor, OpenAI SDK) connect exclusively to Cloud-Agent's unified gateway (`http://127.0.0.1:3001`). No extra external ports or firewall rules required.
- **Client Harness & XML Sanitizer**: Automatically strips 500+ lines of client XML tags (`<guidelines>`, `<memory_management>`, `<tools>`) and timezone metadata, preventing prompt injection false positives in underlying Gemini/Agy models.
- **Session Continuity Tracking**: Maps client session IDs to persistent `agy --conversation` identifiers, ensuring flawless 10+ turn continuous context and deep reasoning.
- **Streaming Instant Termination**: Detects `event: result` and immediately closes SSE streams, eliminating terminal hanging.
- **Interactive Control Dashboard**: Built-in tab for real-time CLI probing, latency benchmarking, model matrix inspection, and active session inspection.
- **Slash Skill Registration**: Bundles `/agy` agent command and instructions automatically.

---

## 🚀 Quick Start & Installation

### 1. In Cloud-Agent / CloudCLI UI
1. Open Cloud-Agent Web UI (`http://localhost:3001`).
2. Navigate to **Settings** ➔ **Plugins**.
3. Under **Install Plugin**, paste the repository URL:
   ```text
   https://github.com/solshevik/cloudcli-plugin-agy
   ```
4. Click **Install**. Cloud-Agent will automatically clone, build, and enable the plugin.
5. The **Google Antigravity (agy)** tab will appear in your workspace.

### 2. Local Development & Softlink
```bash
# Clone repository
git clone git@github.com:solshevik/cloudcli-plugin-agy.git /home/yubs/cloudcli-plugin-agy
cd /home/yubs/cloudcli-plugin-agy

# Install dependencies and build
npm install
npm run build

# Link to CloudCLI plugins directory
mkdir -p ~/.claude-code-ui/plugins
ln -s /home/yubs/cloudcli-plugin-agy ~/.claude-code-ui/plugins/cloudcli-plugin-agy
```

---

## 📡 Usage with External Clients

### Claude Code CLI
Claude Code routes directly through the Cloud-Agent API Gateway without extra port configuration:
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3001"
export ANTHROPIC_API_KEY="sk-any-token"

# Launch Claude Code
claude
```

### Direct Gateway cURL Call
```bash
curl -N http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -d '{
    "model": "agy/gemini-3.8-flash-low",
    "messages": [{"role": "user", "content": "Explain quantum computing briefly"}],
    "stream": true
  }'
```

---

## 🤖 Supported Models Matrix

| Model Identifier | Engine Target | Characteristics |
| :--- | :--- | :--- |
| `agy/gemini-3.8-flash-low` | Gemini 3.8 Flash (Low effort) | Ultra-low first-token latency, fast execution |
| `agy/gemini-3.8-flash-high` | Gemini 3.8 Flash (High effort) | Deep reasoning, complex logic derivation |
| `agy/claude-sonnet-4-6` | Claude Sonnet 4.6 | High-grade coding, thinking model |
| `agy/gpt-oss-120b-medium` | GPT-OSS 120B | Open-weights high capability model |

---

## 🧪 Testing & Build

```bash
# Run unit tests
npm test

# Build TypeScript to dist/
npm run build
```

---

## 📄 License

GNU Affero General Public License v3.0 or later ([AGPL-3.0-or-later](LICENSE)).
