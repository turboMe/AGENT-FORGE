<p align="center">
  <h1 align="center">AGENT-FORGE</h1>
  <p align="center">Self-Evolving Agent Ecosystem</p>
  <p align="center">
</p>

---

**Agent-Forge** is an AI system that automatically creates, remembers, and improves specialized AI agents for any task. Describe what you need — the system builds an expert agent, saves it, and next time you need something similar, it's instant.

The system gets smarter with every task.

## The Problem

Every time you need AI to do something specific — write a cold email, analyze data, review code — you start from scratch. You write a prompt, iterate, maybe get a decent result. Tomorrow, you do it all over again.

Prompt engineering is a bottleneck. It's repetitive, inconsistent, and doesn't scale.

## The Solution

Agent-Forge replaces manual prompt engineering with an automated pipeline:

1. **You describe the task** — in plain language
2. **System searches** its skill library — has it solved something similar before?
3. **If yes** — loads the existing skill and executes instantly
4. **If no** — creates a new specialized agent with the right expertise, persona, and process
5. **Saves everything** — next time, it's a cache hit, not a rebuild
6. **Learns** — tracks what works, what doesn't, improves over time




## Key Features

- **Auto-creation of specialized agents** — each with a tailored persona, process, and quality standards
- **Skill memory** — agents persist across sessions, building a growing library
- **Pattern library** — 8 expert patterns (Analyst, Creator, Advisor, Processor, Orchestrator, Guardian, Teacher, Negotiator) matched to task type
- **Self-improvement** — system tracks quality scores and optimizes underperforming skills
- **Model-agnostic** — works with Claude, GPT, Gemini, or local models (Ollama)
- **Tool integration** (v2) — connects to 1,200+ tools via n8n for real automations, not just text

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Your Task  │────▶│ Orchestrator │────▶│ Skill Search │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                    ┌───────▼───────┐      Found? │
                    │    Execute    │◀─── YES ─────┘
                    │  with skill   │
                    └───────┬───────┘      NO ────┐
                            │                     │
                    ┌───────▼───────┐     ┌───────▼───────┐
                    │   Deliver     │     │    Prompt      │
                    │   Result      │     │   Architect    │
                    └───────────────┘     │  (creates new) │
                                         └───────┬───────┘
                                                 │
                                         ┌───────▼───────┐
                                         │  Save to Skill │
                                         │    Library     │
                                         └───────────────┘
```

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for full stack)

### Installation

```bash
git clone https://github.com/turboMe/AGENT-FORGE.git
cd AGENT-FORGE
pnpm install
cp .env.example .env
# Add your API keys to .env
```

### Run locally

```bash
# Start all services
docker compose up -d

# Run the API
pnpm dev
```

### Run your first task

```bash
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{"task": ""}'
```

> **Note:** Agent-Forge is in early development. 

## Architecture

```
packages/
├── api/              # REST API (Fastify)
├── orchestrator/     # Task routing and coordination
├── skill-library/    # Skill storage, search, indexing
├── llm-gateway/      # Multi-model LLM abstraction
├── memory/           # Persistent memory (Letta)
└── prompt-architect/ # Automatic agent/skill creation
```

**Tech stack:** TypeScript, Node.js, Fastify, MongoDB Atlas, Letta (MemGPT), Docker, Google Cloud Run.

## Roadmap

- [x] Core orchestration engine
- [x] Prompt Architect — automatic skill creation
- [x] Skill library with search and indexing
- [x] Multi-model LLM gateway (Claude, GPT, local models)
- [x] REST API with authentication
- [ ] n8n integration — tool-equipped automations
- [ ] Web UI — chat interface, skill browser, workflow dashboard
- [ ] Multi-agent collaboration
- [ ] Full offline mode with local models (Ollama)




---

<p align="center">
  <sub>Built in Reykjavik, Iceland 🇮🇸</sub>
</p>
