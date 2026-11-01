---
name: agy
description: Use Google Antigravity (agy) local CLI for deep code reasoning and model execution.
---

# Google Antigravity (agy) Local Engine

This skill interfaces with the local Google Antigravity (`agy`) CLI, supporting Gemini 3.8 and Claude Sonnet high-reasoning local execution.

## Supported Models
- `gemini-3.8-flash-low` (Fast execution, minimal reasoning latency)
- `gemini-3.8-flash-high` (Deep reasoning, complex logic and architectural design)
- `claude-sonnet-4-6` (Anthropic Claude model through Antigravity local bridge)
- `gpt-oss-120b-medium` (Open-source high capability model)

## Gateway Integration
When running under Cloud-Agent / CloudCLI, requests sent to `http://127.0.0.1:3001/v1/chat/completions` or `/v1/messages` with model `agy/<model_name>` are automatically delegated to this plugin driver.

## Direct CLI Usage
```bash
# Direct turn execution
agy "Your prompt here"

# Continue existing session
agy --conversation <conversation_id> "Follow-up question"
```
