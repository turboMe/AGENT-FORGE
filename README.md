<p align="center">
  <h1 align="center">AGENT-FORGE</h1>
  <p align="center">Self-Evolving Agent Ecosystem</p>
  <p align="center">
    <a href="#quickstart">Quickstart</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#roadmap">Roadmap</a> •
    <a href="#contributing">Contributing</a>
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/turboMe/AGENT-FORGE/stargazers"><img src="https://img.shields.io/github/stars/turboMe/AGENT-FORGE?style=social" alt="Stars"></a>
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

```
First time:  "Write a cold email" → 30 seconds (creates agent)
Second time: "Write another cold email" → 2 seconds (loads existing)
```

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
  -d '{"task": "Write a professional cold email to a restaurant owner"}'
```

> **Note:** Agent-Forge is in early development. The API and features are evolving rapidly. Star the repo to stay updated.

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
- [ ] Multi-model LLM gateway (Claude, GPT, local models)
- [ ] REST API with authentication
- [ ] n8n integration — tool-equipped automations
- [ ] Web UI — chat interface, skill browser, workflow dashboard
- [ ] Marketplace — share and discover community skills
- [ ] Multi-agent collaboration
- [ ] Full offline mode with local models (Ollama)

## The Story Behind

Agent-Forge is built by a solo founder who spent 15 years running 
professional kitchens before teaching himself to code. But this 
project isn't about cooking — it's about a lifelong obsession 
with designing systems.

A kitchen brigade, a software architecture, an AI agent network — 
they're the same problem: how do you coordinate specialized units 
to produce consistent, high-quality output under pressure?

Agent-Forge is the answer I've been building toward for years — 
a system that designs its own systems.

## Contributing

Agent-Forge is open source and we welcome contributions. Whether it's a bug fix, a new skill pattern, documentation, or a feature — we'd love your help.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Built with obsession in Reykjavik, Iceland 🇮🇸</sub>
</p>
