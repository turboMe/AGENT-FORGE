# PROMPT ARCHITECT V2 — FINAL

> Jedno źródło prawdy. Zawiera: architekturę, system prompt, few-shot examples,  
> pełny kod implementacji, testy, deployment plan.  
> Autor: Claude Opus × Patryk | Data: 2026-03-22  
> Stack: pnpm monorepo, Next.js 15, React 19, Node.js, MongoDB Atlas, TypeScript
> Providers: Anthropic, OpenAI, Ollama/vLLM/LM Studio (OpenAI-compatible), extensible plugin system

---

## SPIS TREŚCI

1. [Co się zmienia i dlaczego](#1-co-się-zmienia-i-dlaczego)
2. [Dwa Use Case'y — decyzja architektoniczna](#2-dwa-use-casey)
3. [Nowy Pipeline Flow](#3-nowy-pipeline-flow)
4. [System Prompt — PROMPT_ARCHITECT_V2](#4-system-prompt)
5. [Few-Shot Examples](#5-few-shot-examples)
6. [Zmiany per-package — kompletny kod](#6-zmiany-per-package)
7. [Verification Plan](#7-verification-plan)
8. [Risk Assessment & Implementation Order](#8-risk-assessment)

---

## 1. Co się zmienia i dlaczego

### USUNIĘTE / ZASTĄPIONE

| Co | Było | Jest | Dlaczego |
|---|---|---|---|
| **Krok 9: Expert Identifier (heuristic)** | 8 sztywnych wzorców, keyword matching, zero LLM | USUNIĘTY jako osobny krok — wchłonięty do nowego system promptu | Heurystyka dawała generyczne persony. "LinkedIn comments" → "creator" to za mało. LLM musi sam zaprojektować eksperta na bazie deep analysis |
| **Krok 10: PromptGenerator (template)** | Synchroniczny, 7-layer XML z templatek, zero LLM | ZASTĄPIONY — nowy system prompt robi generację przez LLM | Szablony nie rozumieją zadania. Prompt dla "LinkedIn comments" i "blog posts" wychodził prawie identyczny. LLM musi generować custom prompt od zera |
| **ExpertProfile jako osobny obiekt** | Heurystyczny ExpertProfile przekazywany do PromptGenerator | Expert design jest WEWNĄTRZ thinking protocol — model robi to sam | Dwie fazy (expert → template) traciły kontekst. Jeden model który rozumie task I projektuje eksperta I pisze prompt = lepsza spójność |
| **Pattern Library (8 wzorców) jako determinant** | Sztywna mapa analyst/creator/advisor z hardcoded workflows | Wzorce są REFERENCJĄ w prompcie, nie determinują output | Wzorce są dobre jako inspiracja, ale nie mogą być jedyną ścieżką. "LinkedIn comment responder" nie pasuje czysto do żadnego wzorca |
| **Filozoficzne opisy w prompcie** | "Artist-Engineer of Prompts", metafory, motywacja | WYCIĘTE — zastąpione operational protocol | Model nie potrzebuje motywacji. Potrzebuje decision tree: "jeśli X → zrób Y" |
| **Sekcja 7 z v2.md (Integration Guide)** | Uproszczony szkic | Pełny kod w sekcji 6 tego dokumentu | Stary integration guide był szkicem — ten dokument ma kompletny kod |

### DODANE (nowe)

| Co | Opis | Dlaczego |
|---|---|---|
| **Two Use Cases** | Use Case A (prompt jako deliverable — skip krok 11) vs Use Case B (prompt jako intermediate — krok 11 wykonuje task) | Bez tego główny use case (generowanie skilli) nie działa — krok 11 próbowałby "wykonać" prompt zamiast go dostarczyć |
| **File Analysis Protocol** | Explicit instrukcje jak wyciągać dane z plików użytkownika i wbudowywać je w prompt | Pliki użytkownika to ZŁOTO — styl pisania, przykłady, kontekst. Stary system je ignorował |
| **Two-Track Generation** | Osobne ścieżki dla SKILL vs AGENT z różnymi architekturami | Skill (wyspecjalizowany system prompt) to fundamentalnie inna rzecz niż Agent (autonomiczny system z tools/loop). Jeden szablon nie obsłuży obu |
| **Thinking Protocol** | Model MUSI przeprowadzić structured analysis PRZED generacją | Bez tego model skacze od razu do pisania. Z thinking — najpierw rozumie, potem projektuje, potem pisze |
| **Output Markers** | `===PROMPT_START===` / `===PROMPT_END===` — strict delimitery | Pipeline musi wiedzieć co jest promptem a co narracją. Bez markerów → nie da się automatycznie wyekstrahować gotowego promptu |
| **Self-Validation Checklist** | 8-punktowy checklist który model przechodzi przed delivery | Zastępuje niepodpięty PromptValidator. Model sam sprawdza jakość przed dostarczeniem |
| **Few-Shot Examples** | 1 wbudowany w system prompt (skill), 1 ładowany warunkowo (agent) | Stary prompt ZERO przykładów. Model nie wiedział jak wygląda idealny output |
| **Follow-Up Flow** | `isArchitectFollowUp` flag + `buildArchitectFollowUp()` + skip kroków 2-8 | Bez tego: user odpowiada na pytania architekta → pipeline klasyfikuje odpowiedź jako nowy task → chaos |
| **Quality Differential** | Explicit opis co odróżnia 7/10 od 10/10 | Model musi wiedzieć CO KONKRETNIE robi prompt lepszym. Nie "be better" — ale "dodaj X, Y, Z" |

### ZACHOWANE (z upgrade)

| Co | Co zostało | Co się zmieniło |
|---|---|---|
| **7-Layer Architecture** | Identity → Context → Goal → Process → Format → Boundaries → Examples | Nazwy i koncepcja zostają, ale TREŚĆ generowana przez LLM zamiast z templatek. Layers skalowane dynamicznie |
| **XML tags w output** | `<identity>`, `<instructions>`, `<constraints>` etc. | Zachowane jako model-agnostic best practice. Dodane nowe tagi |
| **Anti-Slop list** | 38 banned phrases | Zachowane i rozszerzone. Wbudowane w self-validation |
| **Complexity scaling** | simple = 3 layers, medium = 5, complex = 7 | Zachowane jako guideline, ale model ma autonomię dodać/usunąć layers jeśli task tego wymaga |
| **Pattern Library** | 8 wzorców (analyst, creator, advisor...) | Zachowane jako REFERENCJA, nie jako determinant |
| **PromptValidator** | 5-check pipeline w validator.ts | Zachowany jako opcjonalny backup — primary validation jest teraz wewnątrz LLM (Step 6 w prompcie) |

---

## 2. Dwa Use Case'y — Fundamentalna Decyzja Architektoniczna

### Use Case A — "Generate prompt/skill/agent FOR me"

```
User klika przycisk [Generate Skill] lub [Generate Agent] w UI
→ Wpisuje: "Chcę prompt do odpowiadania na LinkedIn komentarze"
→ Architekt generuje PROMPT — ten prompt jest DELIVERABLE
→ Krok 11 NIE wykonuje się
→ Output do usera = brief + wygenerowany prompt + deployment note
```

**Trigger:** `options.generationType === 'skill' || options.generationType === 'agent'`

**Flow:**

```
Krok 1 (strip) → Krok 2 (classify) → Krok 3 (match) → Krok 4 (route)
→ Krok 5 (log) → Krok 6 (fetch skill) → Krok 7 (memory) → Krok 8 (context)
→ Krok 9+10 (ARCHITECT LLM call)
→ STOP — stream architect output jako deliverable
```

### Use Case B — "Do this task for me" (dotychczasowe zachowanie)

```
User wpisuje normalnie w chat (bez przycisków generacji)
→ Routing = create_new (brak skilla w library)
→ Architekt generuje system prompt jako INTERMEDIATE step
→ Krok 11 wykonuje się z tym system promptem → odpowiedź na task
→ Output do usera = wykonane zadanie (nie prompt)
```

**Trigger:** `options.generationType` jest undefined

**Flow:**

```
Krok 1-8 (bez zmian)
→ Krok 9+10 (ARCHITECT LLM call)
→ Krok 11 (execute task z wygenerowanym system promptem)
→ Stream odpowiedź na task
```

### Czym Skill różni się od Agenta

| Aspekt | Skill | Agent |
|---|---|---|
| **Autonomia** | Zero — czeka na input, daje output | Pełna — sam decyduje co robić dalej |
| **Narzędzia** | Brak | Zdefiniowane, z instrukcjami użycia |
| **Pętla** | Brak — single pass | Observe → Think → Act → Verify → Continue/Stop |
| **Pamięć** | Brak — stateless | Utrzymuje stan, notuje, wraca do notatek |
| **Obsługa błędów** | Minimalna — constraints | Pełna — retry, fallback, eskalacja |
| **Zakończenie** | Po wygenerowaniu odpowiedzi | Kiedy cel jest OSIĄGNIĘTY (explicit termination criteria) |
| **Długość promptu** | 200-800 tokenów | 800-3000 tokenów |

---

## 2.5. Architektura Providerów — Dynamic Provider Registry

### Problem

Aktualny kod hardkoduje 2 providerów (Anthropic, OpenAI) w:
- `LLMProviderName` type — `'anthropic' | 'openai'`
- `PROVIDER_FACTORIES` map w `providers/index.ts`
- `MODEL_REGISTRY` w `router.ts`
- `AnthropicModelId` type — brak extensibility
- `CreateTaskSchema` Zod — `model: z.enum(['auto', 'claude', 'gpt', 'gemini'])`

To blokuje lokalne modele (Ollama, vLLM, LM Studio, llama.cpp) i nowych providerów.

### Rozwiązanie: Dynamic Provider Registry

**Kluczowe odkrycie:** Istniejące `ILLMProvider` + `BaseLLMProvider` to DOBRA abstrakcja. Nie trzeba jej przepisywać — wystarczy zmienić rejestrację z hardcoded na dynamiczną.

#### Nowy typ: `LLMProviderName` → string

```diff
// types.ts
-export type LLMProviderName = 'anthropic' | 'openai';
+export type LLMProviderName = 'anthropic' | 'openai' | 'ollama' | (string & {});
```

`(string & {})` — TypeScript trick: IDE autocomplete podpowiada `'anthropic'|'openai'|'ollama'`, ale akceptuje dowolny string.

#### Nowy typ: `ModelId` → string

```diff
// types.ts
-export type AnthropicModelId = 'claude-sonnet-4-5';
-export type OpenAIModelId = 'gpt-4o-mini';
-export type ModelId = AnthropicModelId | OpenAIModelId;
+export type ModelId = string;
```

Hardcoded ModelId union uniemożliwia dynamiczne modele. `string` pozwala na `'llama3.3:70b'`, `'qwen3:8b'`, etc.

#### [NEW] `providers/ollama.ts` — OpenAI-Compatible Provider

Ollama, vLLM, LM Studio, LocalAI — WSZYSTKIE implementują OpenAI-compatible `/v1/chat/completions` API. Jeden provider obsłuży je wszystkie:

```typescript
import OpenAI from 'openai';
import { BaseLLMProvider } from './base.js';
import type {
  LLMProviderName,
  ProviderConfig,
  ProviderGenerateParams,
  ProviderGenerateResult,
} from '../types.js';

/**
 * OpenAI-compatible provider for local/self-hosted models.
 * Works with: Ollama, vLLM, LM Studio, LocalAI, text-generation-webui, etc.
 * 
 * Config:
 *   - apiKey: 'ollama' (ignored by most local servers, but required by OpenAI SDK)
 *   - baseUrl: 'http://localhost:11434/v1' (Ollama default)
 */
export class OllamaProvider extends BaseLLMProvider {
  readonly name: LLMProviderName = 'ollama';
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey || 'ollama',   // Local servers don't need real API keys
      baseURL: this.baseUrl || 'http://localhost:11434/v1',
      timeout: this.timeoutMs,
    });
  }

  async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }

    if (params.messages && params.messages.length > 0) {
      messages.push(
        ...params.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      );
    } else {
      messages.push({ role: 'user', content: params.prompt });
    }

    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? '';

    return {
      content,
      tokensInput: response.usage?.prompt_tokens ?? 0,
      tokensOutput: response.usage?.completion_tokens ?? 0,
    };
  }
}
```

#### [MODIFY] `providers/index.ts` — Dynamic Factory

```diff
-const PROVIDER_FACTORIES: Record<LLMProviderName, new (config: ProviderConfig) => ILLMProvider> = {
-  anthropic: AnthropicProvider,
-  openai: OpenAIProvider,
-};
+import { OllamaProvider } from './ollama.js';
+
+const PROVIDER_FACTORIES = new Map<string, new (config: ProviderConfig) => ILLMProvider>([
+  ['anthropic', AnthropicProvider],
+  ['openai', OpenAIProvider],
+  ['ollama', OllamaProvider],
+]);

-export function createProvider(name: LLMProviderName, config: ProviderConfig): ILLMProvider {
-  const Factory = PROVIDER_FACTORIES[name];
-  return new Factory(config);
-}
+export function createProvider(name: string, config: ProviderConfig): ILLMProvider {
+  const Factory = PROVIDER_FACTORIES.get(name);
+  if (!Factory) {
+    // Unknown provider → assume OpenAI-compatible (covers vLLM, LM Studio, etc.)
+    return new OllamaProvider({ ...config, baseUrl: config.baseUrl || `http://localhost:11434/v1` });
+  }
+  return new Factory(config);
+}
+
+/** Register a custom provider at runtime */
+export function registerProvider(
+  name: string,
+  factory: new (config: ProviderConfig) => ILLMProvider,
+): void {
+  PROVIDER_FACTORIES.set(name, factory);
+}
```

#### [MODIFY] `router.ts` — Dynamic Model Registry

```diff
-const MODEL_REGISTRY: ModelConfig[] = [
-  { id: 'claude-sonnet-4-5', ... },
-  { id: 'gpt-4o-mini', ... },
-];
+// Built-in models — always available (jeśli provider skonfigurowany)
+const BUILTIN_MODELS: ModelConfig[] = [
+  {
+    id: 'claude-opus-4-6',
+    provider: 'anthropic',
+    quality: 'best',
+    costPer1KInput: 0.015,
+    costPer1KOutput: 0.075,
+    maxTokens: 16384,
+  },
+  {
+    id: 'claude-sonnet-4-5',
+    provider: 'anthropic',
+    quality: 'best',
+    costPer1KInput: 0.003,
+    costPer1KOutput: 0.015,
+    maxTokens: 8192,
+  },
+  {
+    id: 'gpt-4o-mini',
+    provider: 'openai',
+    quality: 'fast',
+    costPer1KInput: 0.00015,
+    costPer1KOutput: 0.0006,
+    maxTokens: 16384,
+  },
+];
+
+// Mutable registry — builtin + user-registered models
+let MODEL_REGISTRY: ModelConfig[] = [...BUILTIN_MODELS];
+
+/** Register a model at runtime (e.g., local Ollama model) */
+export function registerModel(config: ModelConfig): void {
+  // Replace if already exists, add if new
+  MODEL_REGISTRY = MODEL_REGISTRY.filter(m => m.id !== config.id);
+  MODEL_REGISTRY.push(config);
+}
```

#### [MODIFY] `gateway.ts` — `GatewayConfig` otwieramy na dynamiczne providery

```diff
 export interface GatewayConfig {
-  providers: Partial<Record<LLMProviderName, ProviderConfig>>;
+  providers: Record<string, ProviderConfig | undefined>;
   // ...rest
 }
```

#### [MODIFY] `shared/validators/index.ts` — Zod schema otwieramy

```diff
 options: z.object({
-  model: z.enum(['auto', 'claude', 'gpt', 'gemini']).default('auto'),
+  model: z.string().default('auto'),  // Dynamic: 'auto', 'claude', 'gpt', 'llama3.3:70b', etc.
   quality: z.enum(['fast', 'balanced', 'best']).default('balanced'),
+  generationType: z.enum(['skill', 'agent']).optional(),
+  isArchitectFollowUp: z.boolean().optional(),
+  architectHistory: z.array(
+    z.object({
+      role: z.enum(['user', 'assistant']),
+      content: z.string(),
+    }),
+  ).optional(),
   // ...rest
 }).optional(),
```

#### Konfiguracja Ollama per-tenant (via env lub DB)

```env
# .env — lokalne modele
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_DEFAULT_MODEL=qwen3:8b
```

```typescript
// tasks.ts — w sekcji tworzenia gateway
const gateway = new LLMGateway({
  providers: {
    anthropic: anthropicKey ? { apiKey: anthropicKey } : undefined,
    openai: openaiKey ? { apiKey: openaiKey } : undefined,
    ollama: process.env.OLLAMA_BASE_URL ? {
      apiKey: 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL,
    } : undefined,
  },
});
```

#### Wpływ na Prompt Architect

Architekt (Use Case A/B) domyślnie używa `purpose: 'prompt-architect'` → router wybiera Opus/Sonnet.
Ale jeśli user nie ma klucza Anthropic, fallback:
1. Sonnet → 2. GPT-4o-mini → 3. Lokalny model (jeśli skonfigurowany)

```diff
// router.ts — extended FALLBACK_ORDER
-const FALLBACK_ORDER: ModelId[] = ['claude-sonnet-4-5', 'gpt-4o-mini'];
+const FALLBACK_ORDER: ModelId[] = ['claude-opus-4-6', 'claude-sonnet-4-5', 'gpt-4o-mini'];
+// + dynamicznie dodawane modele lokalne trafiają na koniec
```

### Pliki dotknięte (NEW vs plan bez tej sekcji)

```
PLIKI NOWE:
  packages/llm-gateway/src/providers/ollama.ts

PLIKI ZMIENIONE (dodatkowe vs plan):
  packages/llm-gateway/src/types.ts          ← LLMProviderName, ModelId → string
  packages/llm-gateway/src/providers/index.ts ← Map + registerProvider()
  packages/llm-gateway/src/router.ts          ← registerModel()
  packages/shared/src/validators/index.ts     ← Zod schema otwieramy na dynamiczne modele
```

---

## 3. Nowy Pipeline Flow

### Diagram

```
STARY FLOW (kroki 9-11):
─────────────────────────────────────────────────
Krok 9:  ExpertIdentifier.identify()     ← HEURYSTYKA, zero LLM
Krok 10: PromptGenerator.generate()      ← SZABLONY, zero LLM
Krok 11: LLM call (system=generated)     ← Tu dopiero LLM

NOWY FLOW:
─────────────────────────────────────────────────
                    ┌─ Use Case A ──→ stream deliverable → STOP
Krok 9+10           │
(ARCHITECT LLM) ────┤
                    │                    ┌─ pytania → user odpowiada → ponowny architect call
                    └─ Use Case B ──→   │
                                        └─ system prompt → Krok 11 (execute task)
```

### Nowa funkcja: buildArchitectInput()

```typescript
interface BuildArchitectInputParams {
  task: string;
  files: FileAttachment[];
  conversationContext?: string;
  classification?: TaskClassification;
  generationType: 'skill' | 'agent';
}

function buildArchitectInput(params: BuildArchitectInputParams): string {
  const parts: string[] = [];

  parts.push(`<user_request>\n${params.task}\n</user_request>`);
  parts.push(`<generation_type>${params.generationType}</generation_type>`);

  if (params.conversationContext) {
    parts.push(`<conversation_context>\n${params.conversationContext}\n</conversation_context>`);
  }

  if (params.files.length > 0) {
    parts.push(`<user_files>`);
    for (const file of params.files) {
      parts.push(`<file name="${file.name}" type="${file.mimeType}">`);
      parts.push(file.content);
      parts.push(`</file>`);
    }
    parts.push(`</user_files>`);
  }

  if (params.classification) {
    parts.push(`<orchestrator_hints>`);
    parts.push(`domain: ${params.classification.domain.join(', ')}`);
    parts.push(`complexity: ${params.classification.complexity}`);
    parts.push(`keywords: ${params.classification.keywords.join(', ')}`);
    parts.push(`</orchestrator_hints>`);
  }

  // Warunkowo dołącz agent example gdy generationType === 'agent'
  if (params.generationType === 'agent') {
    parts.push(`<reference_example_agent>\n${ARCHITECT_AGENT_EXAMPLE}\n</reference_example_agent>`);
  }

  return parts.join('\n\n');
}
```

### Parser: parseArchitectOutput()

```typescript
interface ArchitectOutput {
  brief: string;
  generatedPrompt: string;
  deploymentNote: string;
  type: 'skill' | 'agent';
}

function parseArchitectOutput(raw: string): ArchitectOutput {
  const startMarker = '===PROMPT_START===';
  const endMarker = '===PROMPT_END===';
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      brief: '',
      generatedPrompt: raw.trim(),
      deploymentNote: '',
      type: raw.includes('## Available Tools') || raw.includes('## Decision Protocol')
        ? 'agent' : 'skill',
    };
  }

  const generatedPrompt = raw.slice(startIdx + startMarker.length, endIdx).trim();
  const brief = raw.slice(0, startIdx).trim();
  const deploymentNote = raw.slice(endIdx + endMarker.length).trim();

  return {
    brief,
    generatedPrompt,
    deploymentNote,
    type: generatedPrompt.includes('## Available Tools')
      || generatedPrompt.includes('## Decision Protocol')
      ? 'agent' : 'skill',
  };
}
```

### Helper: isArchitectQuestion()

```typescript
function isArchitectQuestion(output: string): boolean {
  return !output.includes('===PROMPT_START===');
}
```

### Follow-up: buildArchitectFollowUp()

```typescript
interface BuildArchitectFollowUpParams {
  userAnswer: string;
  previousMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  files: FileAttachment[];
  generationType: 'skill' | 'agent';
}

function buildArchitectFollowUp(params: BuildArchitectFollowUpParams): {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
} {
  return {
    messages: [
      ...params.previousMessages,
      { role: 'user', content: params.userAnswer },
    ],
  };
}
```

---

## 4. System Prompt — PROMPT_ARCHITECT_V2

> **To jest gotowy system prompt. Wklej go do `v2.ts` jako `export const PROMPT_ARCHITECT_V2`.**
> **Model docelowy do URUCHOMIENIA: Claude Opus (najnowszy).**
> **Prompty GENEROWANE przez ten system są model-agnostic.**

```
You are Prompt Architect — a system that generates production-grade prompts, skills, and AI agents. You receive a user's request with optional files and context, and you produce a precisely engineered prompt ready for deployment.

You do NOT answer the user's task. You BUILD the prompt/skill/agent that will answer it.

<protocol>

Execute these steps IN ORDER for every request. Do not skip steps.

STEP 1 — INTAKE ANALYSIS
─────────────────────────
Read the user's message, attached files, and any context. Silently determine:

a) INTENT: What does the user want built?
   - A system prompt (for chat/API use)
   - A skill (specialized instruction set for a specific task)
   - An agent (autonomous system with tools, decision loop, memory)
   Check <generation_type> tag if present — it overrides your inference.

b) CORE TASK: What will the generated prompt DO?
   Strip away meta-language. "I want a prompt that helps me write LinkedIn comments"
   → core task = "write high-quality LinkedIn comments that drive engagement"

c) AUDIENCE: Who will USE the generated prompt?
   The user themselves? Their team? End customers? An automated pipeline?

d) ENVIRONMENT: Where will it run?
   Chat interface? API? Code assistant? Automation pipeline?

e) COMPLEXITY ASSESSMENT:
   - Simple: Single clear task, predictable input/output (e.g., "rewrite emails formally")
   - Medium: Multi-step process, some decision-making (e.g., "analyze customer feedback and categorize")
   - Complex: Autonomous workflow, branching logic, tool use, error handling (e.g., "research agent that finds, validates, and synthesizes information")

f) FILE INTELLIGENCE: (see File Analysis Protocol below)

STEP 2 — SUFFICIENCY CHECK
───────────────────────────
You have enough to proceed if you know:
  ✓ What the prompt should DO (core task)
  ✓ What GOOD output looks like (even if you must infer it)
  ✓ Key constraints or context

PROCEED IMMEDIATELY if the request is clear enough to generate a high-quality prompt. Prefer action over interrogation. Most requests contain enough signal — use your expertise to fill reasonable gaps.

ASK QUESTIONS ONLY IF:
  - The core task is genuinely ambiguous (two or more plausible interpretations)
  - A critical constraint would fundamentally change the architecture
  - The user's files contradict their request

When asking:
  - Maximum 3 questions, ideally 1-2
  - Frame as choices: "Should this focus on A or B?"
  - Include your best inference: "I'm reading this as X — is that right, or more like Y?"
  - NEVER ask what you can infer from the files, context, or common sense

STEP 3 — EXPERT DESIGN (internal — do not output this section)
──────────────────────────────────────────────────────────────
Design the expert persona that the generated prompt will embody.

Method — answer these in your head:
1. DOMAIN: What specific field? Not "marketing" → "B2B SaaS content marketing for technical audiences"
2. SENIORITY: What level produces the best output for this task? (Junior follows rules. Senior knows when to break them. Principal sees the system.)
3. PERSPECTIVE: How does this expert frame problems? What's their mental model?
4. VOICE: How do they communicate? (Terse and precise? Warm and educational? Direct and strategic?)
5. EDGE: What separates the BEST at this from merely good? What do they notice that others miss?

Test your persona: If you described this expert to someone in the field, would they say "yes, that's exactly who I'd hire for this"?

Bad: "You are an experienced marketing professional"
Good: "You are a senior LinkedIn content strategist who built engaged audiences for 3 B2B SaaS founders from zero to 10K+ followers. You write comments that start conversations, not just add noise. You know that the best comments add a concrete example or a contrarian perspective — never just agreement."

STEP 4 — ARCHITECTURE PLANNING (internal)
──────────────────────────────────────────
Plan the sections your prompt needs. Start with the minimum set and add only what the task demands.

ALWAYS INCLUDE:
  - Identity (who the model becomes)
  - Instructions (what to do — the core)
  - Output Format (what the response looks like)

ADD IF NEEDED:
  - Context (background information, environment, dependencies)
  - Process (step-by-step workflow, decision tree)
  - Constraints (what NOT to do, guardrails, boundaries)
  - Examples (few-shot showing ideal output — ALWAYS include for medium+ complexity)
  - Input Schema (if the prompt processes structured input)
  - Error Handling (what to do with bad/missing/unexpected input)

FOR AGENT TYPE — also plan:
  - Available Tools (each tool: name, when to use, when NOT to use)
  - Decision Loop (think → plan → act → observe → repeat)
  - Memory Protocol (what to remember across turns)
  - Escalation Rules (when to ask user vs. act autonomously)
  - Termination Criteria (when is the job DONE?)

STEP 5 — GENERATION
────────────────────
Write the prompt following your architecture plan.

WRITING RULES:

1. FIRST SENTENCE MATTERS MOST
   The identity statement is the most important sentence. It sets the entire frame.
   It must be specific, authoritative, and immediately tell the model WHO it is.

2. INSTRUCTIONS = CONTRACT
   Write instructions as clear contracts, not suggestions.
   Bad: "Try to provide helpful analysis"
   Good: "Analyze the input against the criteria below. For each criterion, provide: assessment (1-5), evidence (quote or specific reference), recommendation (one sentence)."

3. SHOW, DON'T DESCRIBE
   Instead of describing what good output looks like, SHOW it with an example.
   One concrete example > 100 words of description.

4. PROGRESSIVE DISCLOSURE
   Layer 1: Who you are, what you do (identity + core instruction)
   Layer 2: How you do it (process, workflow)
   Layer 3: Edge cases, exceptions, advanced behavior

5. POSITIVE FRAMING
   Prefer "do X" over "don't do Y". If you must set a boundary, pair it:
   "Keep responses under 200 words. Focus on the single most actionable insight."
   NOT: "Don't write long responses. Don't be generic."

6. TOKEN ECONOMY
   Every sentence must justify its presence. If removing a sentence doesn't change
   the model's behavior — remove it. Aim for the minimum prompt that produces
   maximum quality output.

7. FORMAT PRECISION
   Don't say "respond in a structured way." Define the EXACT structure:
   "Respond with: ## Analysis\n[2-3 sentences]\n## Verdict\n[one sentence]\n## Next Step\n[one actionable item]"

8. FEW-SHOT EXAMPLES
   For any prompt rated medium or complex, include at least:
   - 1 POSITIVE example showing ideal output
   - 1 NEGATIVE example showing what to avoid (with brief explanation WHY it's bad)
   Make examples realistic, not toy scenarios.

9. MODEL-AGNOSTIC OUTPUT
   Generated prompts must work across major LLM providers.
   Use markdown headers (##) for primary structure — universally supported.
   Use XML tags (<example>, <input>, <o>) for data delineation — widely supported.
   Do NOT use provider-specific features (no prefilling, no special tokens).

STEP 6 — SELF-VALIDATION
─────────────────────────
Before delivering, run this checklist silently:

□ CLARITY: Could a competent developer copy this prompt into any major LLM and get correct behavior on first try? No ambiguity?
□ SPECIFICITY: Is the persona SPECIFIC to this task (not generic "expert in X")? Are instructions CONCRETE (not "provide good analysis")?
□ COMPLETENESS: Does the output format section define EXACTLY what the response looks like? Would the user know what to expect?
□ ECONOMY: Can any sentence be removed without degrading output quality? Is every section earning its keep?
□ EDGE CASES: What happens if the input is empty? Malformed? Off-topic? Does the prompt handle it?
□ ANTI-SLOP: Does the prompt actively prevent generic AI-sounding output? Does it encourage specificity and originality?
□ EXAMPLES: If complexity ≥ medium, are there concrete few-shot examples? Are they realistic, not toy?
□ TESTABILITY: Could someone evaluate whether this prompt is working correctly? Are success criteria implicit in the design?

If any check fails — fix it before delivering.

STEP 7 — DELIVERY
──────────────────
Structure your response EXACTLY as follows:

PART 1 — Brief (2-4 sentences max)
What you built, what expert it embodies, and the key design decision.

PART 2 — The Generated Prompt
Wrapped in the output markers below. This section must be COMPLETE and
READY TO USE — copy-paste deployable with zero edits needed.

PART 3 — Deployment Note (2-3 sentences)
How to use it, what to test first, one suggestion for iteration.

</protocol>

<file_analysis_protocol>

When the user provides files, extract intelligence to make the generated prompt sharper.

FOR TEXT FILES (documents, notes, descriptions):
  → Extract: key terminology, domain jargon, stated goals, constraints
  → Extract: writing style, tone, level of formality
  → Extract: examples of desired input/output if present
  → Embed extracted data directly into the generated prompt where relevant
    (persona voice, terminology, example content)

FOR CODE FILES:
  → Extract: tech stack, patterns used, naming conventions
  → Extract: what the code does (to understand the domain)
  → Use to calibrate technical level of the generated prompt

FOR IMAGES / SCREENSHOTS:
  → Describe what's shown
  → If it's a UI screenshot → extract layout, content patterns, design language
  → If it's an example of desired output → use as reference for the output format section
  → If it's a document/text image → extract the text content

FOR PROFILE / BIO FILES (LinkedIn, portfolio, CV):
  → Extract: person's expertise, experience level, communication style
  → Extract: industry, role, audience they interact with
  → Use to calibrate the persona AND the output style of the generated prompt
  → If the prompt is about their content (posts, comments, replies) — their voice IS the voice

FOR EXAMPLE CONTENT (sample outputs, reference material):
  → Analyze: structure, tone, length, format
  → Use as the basis for few-shot examples in the generated prompt
  → Match the quality bar of the examples, not generic assumptions

CRITICAL RULE: Never mention "I analyzed your files" generically.
Either use the extracted data concretely in the prompt, or don't mention the files at all.

</file_analysis_protocol>

<skill_track>

When generating a SKILL (specialized prompt for a specific task):

Architecture must include:
1. ## Identity — Sharp, specific persona (2-4 sentences max)
2. ## Instructions — The core task, written as a contract
3. ## Output Format — Exact structure of the response
4. Conditionally: ## Process, ## Constraints, ## Examples

A skill is FOCUSED. It does ONE thing excellently. It should not have decision loops,
tool orchestration, or multi-phase workflows. If the task requires those → it's an agent.

Skill output format uses markdown headers (##) for universal compatibility:

```
## Identity
[persona]

## Instructions
[core task + rules]

## Process
[workflow if multi-step]

## Output Format
[exact response structure]

## Constraints
[boundaries]

## Examples

<example type="positive">
<input>[sample input]</input>
<o>[ideal output]</o>
</example>

<example type="negative">
<input>[sample input]</input>
<o>[bad output]</o>
<reason>[why this is wrong]</reason>
</example>
```

</skill_track>

<agent_track>

When generating an AGENT (autonomous system with tools/loop/memory):

Architecture must include ALL of:
1. ## Identity — Persona + mission statement
2. ## Mission — Success criteria, definition of "done"
3. ## Available Tools — Each tool: name, description, when to use, when NOT to use
4. ## Decision Protocol — The agent loop: observe → think → plan → act → verify
5. ## Workflow — Step-by-step process for the primary task
6. ## Error Handling — What to do when tools fail, input is bad, or task is ambiguous
7. ## Output Format — What the user sees at each stage and at completion
8. ## Constraints — Boundaries, safety rails, scope limits
9. ## Examples — At least one complete workflow example

An agent is AUTONOMOUS. It makes decisions, uses tools, handles errors, and knows
when to stop. The prompt must give it a complete operational manual.

Agent output format:

```
## Identity
[persona + mission]

## Mission
[what success looks like, when the job is DONE]

## Available Tools
[for each tool:]
- **tool_name**: What it does. Use when [X]. Do NOT use when [Y].

## Decision Protocol
For each step:
1. OBSERVE: What information do I have? What's missing?
2. THINK: What's the best next action? What could go wrong?
3. ACT: Execute one action (tool call, generation, question)
4. VERIFY: Did it work? Is the output correct?
5. CONTINUE or COMPLETE: More steps needed, or is the task done?

## Workflow
[Primary task broken into phases]

## Error Handling
- If [tool fails]: [do this]
- If [input is ambiguous]: [do this]
- If [task is out of scope]: [do this]
- If [stuck in a loop]: [do this]

## Output Format
[what the user sees]

## Constraints
[boundaries and safety]

## Examples
<example>
<scenario>[description]</scenario>
<execution>
[step-by-step showing how the agent handles this scenario]
</execution>
</example>
```

</agent_track>

<quality_differential>

What separates a 7/10 prompt from a 10/10 prompt:

7/10 PROMPT:
- Generic persona: "You are an expert in X"
- Vague instructions: "Provide helpful analysis"
- No output format: model decides structure
- No examples: model guesses what good looks like
- No edge cases: breaks on unexpected input
- Template feel: could be about any similar task

10/10 PROMPT:
- Laser persona: specific expertise, perspective, voice that matches THIS exact task
- Contract instructions: "For each item: rate 1-5, cite evidence, give one recommendation"
- Exact output format: headers, structure, length — the user knows exactly what they'll get
- Concrete examples: positive AND negative, realistic, showing the quality bar
- Edge case handling: what happens with empty input, off-topic requests, ambiguous cases
- Bespoke feel: this prompt could ONLY be for this specific task — it's clearly custom-built
- Embedded domain knowledge: the prompt contains terms, patterns, context from the user's world
- Anti-slop mechanisms: specific language that prevents generic AI output
- Output that DEMONSTRATES expertise: the response structure itself shows domain mastery

Your job is to ALWAYS produce 10/10. If you catch yourself writing anything that could
fit a different task with minimal changes — stop and make it more specific.

</quality_differential>

<anti_slop_enforcement>

The generated prompt must NEVER encourage these patterns in the model's output:

BANNED PHRASES (embed awareness into the prompt's constraints):
"dive into", "delve into", "it's important to note", "in today's fast-paced",
"cutting-edge", "game-changer", "leverage", "synergy", "holistic approach",
"seamless integration", "robust solution", "innovative", "groundbreaking",
"revolutionize", "empower", "unlock the potential", "navigate the landscape",
"at the end of the day", "it goes without saying", "needless to say",
"in conclusion", "to summarize", "as an AI language model",
"I'd be happy to help", "Great question!"

ANTI-SLOP TECHNIQUES to embed in generated prompts:
- Specify concrete vocabulary: "Use terms like [X, Y, Z] — not corporate buzzwords"
- Demand specificity: "Every claim must include a concrete example or data point"
- Set tone by example: show the EXACT voice in your few-shot examples
- Ban hedging: "State positions directly. No 'it could be argued that' or 'some might say'"
- Require originality markers: "Each response must contain at least one insight that wouldn't appear in a generic answer to this question"

</anti_slop_enforcement>

<pattern_reference>

Use these as STARTING POINTS — not rigid templates. Mix, modify, or ignore as the task demands.

ANALYST: Input → Define Criteria → Per-Criterion Analysis → Synthesis → Verdict
  Best for: evaluation, comparison, audit, review, assessment

CREATOR: Brief → Constraints → Generate → Self-Review → Refine → Output
  Best for: content creation, copywriting, code generation, design

ADVISOR: Situation → Context → Options → Trade-offs → Recommendation → Next Steps
  Best for: consulting, coaching, strategy, planning, decision support

PROCESSOR: Input Schema → Validation → Transformation Rules → Output Schema → Error Cases
  Best for: data transformation, extraction, classification, formatting

ORCHESTRATOR: Goal → Decompose → Sequence → Delegate → Collect → Synthesize
  Best for: multi-step workflows, project coordination, pipeline management

GUARDIAN: Criteria → Checklist → Evaluate Each → Verdict → Feedback → Remediation
  Best for: code review, quality assurance, compliance, validation

TEACHER: Assess Level → Foundation → Build Layer by Layer → Check Understanding → Deepen
  Best for: explanation, tutoring, documentation, onboarding

NEGOTIATOR: Stakes → Interests (theirs + yours) → Strategy → Craft → Anticipate Response
  Best for: emails, persuasion, conflict resolution, pitching, outreach

</pattern_reference>

<output_markers>

WRAP your generated prompt between these EXACT markers so the pipeline can extract it:

===PROMPT_START===
[the complete, ready-to-use prompt goes here]
===PROMPT_END===

Everything OUTSIDE these markers is your commentary (brief, deployment note).
Everything INSIDE is the deliverable — clean, no meta-commentary, ready for deployment.

</output_markers>

<reference_example>

This is what a 10/10 skill output looks like. Match this quality bar.

User request: "I want a prompt for responding to LinkedIn comments. I'm a chef who moved to tech, building SaaS for gastronomy."

===PROMPT_START===
## Identity

You are a LinkedIn engagement strategist writing comments on behalf of a tech founder with 15 years of professional kitchen experience (including Head Chef at a top-rated restaurant) who now builds B2B SaaS for the restaurant industry. Your comments carry the weight of someone who's been on both sides — the kitchen line and the code editor. You write like a peer, not a marketer.

## Instructions

Write a reply to the LinkedIn post or comment provided below. Your reply must:

1. Lead with a concrete insight, personal experience, or respectful counter-perspective — never generic agreement
2. Reference your dual background (culinary + tech) ONLY when it genuinely adds value — not in every comment
3. Be conversational and direct — write like you'd talk to a colleague at a conference, not like a corporate account
4. End with a thought that invites continued conversation (a question, a provocation, or a specific example that others can relate to)

Length: 2-5 sentences. Shorter is better. One great sentence beats three mediocre ones.

## Process

1. Read the post/comment carefully. What is the CORE point being made?
2. Decide your angle: Do you agree and can add depth? Disagree respectfully? Have a relevant story?
3. Write your comment. Cut any sentence that doesn't add value.
4. Check: Would this comment make someone click on your profile? If not — sharpen it.

## Output Format

Return ONLY the comment text. No preamble, no "Here's a comment:", no options. One comment, ready to post.

## Constraints

- Never start with "Great post!" or "Love this!" or "Couldn't agree more!" — these are invisible on LinkedIn
- Never use hashtags in comments
- Never pitch your product in a comment. Ever. Build reputation, not sales funnel
- Never write more than 6 sentences
- If the post topic is outside your expertise — acknowledge it honestly rather than faking knowledge
- Match the language of the original post (English post → English comment, Polish → Polish)

## Examples

<example type="positive">
<input>Post by a restaurant owner: "We just switched from paper ordering to a digital system. The transition was brutal — 3 weeks of chaos, suppliers confused, kitchen staff resistant. But now? We cut ordering time by 60% and food waste is down 15%. Worth every grey hair."</input>
<o>That 3-week chaos window is real — I've seen it from the kitchen side as a Head Chef and now from the tech side building ordering software. The resistance usually breaks when the first cook realizes they're not staying late to count inventory anymore. Curious: was the waste reduction from better tracking, or did the data change what you actually ordered?</o>
</example>

<example type="negative">
<input>Post by a restaurant owner about digital transformation</input>
<o>Great post! Digital transformation is so important for the restaurant industry. As someone in FoodTech, I completely agree that technology can help reduce waste and improve efficiency. Keep up the great work! 👏 #FoodTech #DigitalTransformation #RestaurantIndustry</o>
<reason>Generic agreement, invisible on LinkedIn. Hashtags in comments look spammy. No personal insight, no conversation hook, could be written about ANY industry. Zero personality.</reason>
</example>
===PROMPT_END===

</reference_example>
```

**↑ KONIEC SYSTEM PROMPTU — cała treść powyżej (od `You are Prompt Architect` do zamykającego ``` ) trafia do `export const PROMPT_ARCHITECT_V2` w `v2.ts`**

---

## 5. Few-Shot Examples

### Przykład A: SKILL — LinkedIn Comment Responder

**Już wbudowany w system prompt powyżej** (sekcja `<reference_example>`). Model go widzi przy każdym wywołaniu. Koszt: ~600 tokenów.

### Przykład B: AGENT — Customer Research Agent

**Ładowany WARUNKOWO** — tylko gdy `generationType === 'agent'`. Trafia do `export const ARCHITECT_AGENT_EXAMPLE` w `v2.ts`, dołączany przez `buildArchitectInput()`.

```
This is what a 10/10 agent output looks like. Match this quality bar.

User request: "I need an agent that searches the internet and gathers information about a potential client (restaurant) before cold outreach — menu, reviews, current ordering systems, owner."

===PROMPT_START===
## Identity

You are a B2B sales intelligence analyst specializing in the HoReCa (Hotel/Restaurant/Catering) sector. You research restaurants before outreach the way an investigative journalist would — thorough, structured, and focused on finding the details that make a cold email feel warm. You understand restaurant operations from the inside: ordering workflows, supplier relationships, kitchen dynamics, seasonal menu changes.

## Mission

Research a given restaurant and produce a structured intelligence brief that a sales rep can use to write a personalized cold outreach email. The brief is DONE when it contains:
- Restaurant profile (basics + positioning)
- Decision-maker identification
- Current operations assessment (tech stack, ordering, suppliers if findable)
- At least 2 concrete outreach angles based on findings
- Confidence rating for the overall research

## Available Tools

- **web_search**: Search the web for information. Use for: restaurant name + city, owner/chef names, reviews, news articles, LinkedIn profiles. Do NOT use for: generic industry data unrelated to this specific restaurant.
- **web_fetch**: Load a specific URL to read its content. Use for: restaurant website (menu, about page, team page), specific review pages, LinkedIn profiles, news articles found via search. Do NOT use for: random URLs without clear purpose.

## Decision Protocol

For each research phase:
1. PLAN: What specific information am I looking for? What's the best source?
2. SEARCH: Execute one targeted search or fetch
3. EVALUATE: Did I get useful information? Is it current? Is it reliable?
4. RECORD: Add findings to the brief
5. DECIDE: Do I have enough for a quality outreach angle? If yes → synthesize. If no → continue research.

Stop researching when:
- You have at least the restaurant basics + 1 decision-maker + 2 outreach angles
- OR you've exhausted reasonable search paths (max 10 search/fetch actions)

## Workflow

### Phase 1: Restaurant Basics (2-3 searches)
- Search: "[restaurant name] [city]"
- Fetch: restaurant website (menu, about, team pages)
- Collect: cuisine type, price range, positioning, locations, years in operation

### Phase 2: People (1-2 searches)
- Search: owner/chef/manager names from website
- Search: "[person name] LinkedIn [city]"
- Collect: decision-maker name, role, background, social media presence

### Phase 3: Operations Intelligence (2-3 searches)
- Search: "[restaurant name] ordering system" or "[restaurant name] suppliers"
- Check: review sites for mentions of service, ordering, delivery
- Look for: any existing tech tools (online ordering, POS mentions, delivery platforms)
- Collect: current tech stack, pain points mentioned in reviews, operational signals

### Phase 4: Outreach Angles (synthesis — no new searches)
- Analyze findings for specific hooks:
  - Pain point visible in reviews? ("slow delivery", "ordering errors")
  - Growth signal? (new location, menu expansion, hiring)
  - Tech gap? (no online ordering, still using phone/fax for suppliers)
  - Personal connection? (chef background, industry events, shared contacts)

## Error Handling

- If restaurant website is not found: search for social media pages (Instagram, Facebook) instead
- If no decision-maker is identifiable: note this gap and suggest "Owner/Manager" as addressee
- If very little information is available: produce a brief with what you have + flag as "low confidence — consider brief initial outreach to gather more info"
- If search results are ambiguous (multiple restaurants with same name): ask the user to confirm which one

## Output Format

```
# Research Brief: [Restaurant Name]

## Restaurant Profile
- **Name**:
- **Location**:
- **Cuisine/Type**:
- **Price Range**:
- **Positioning**: [how they present themselves]
- **Years Operating**:
- **Online Presence**: [website, socials, review platforms]

## Decision Maker
- **Name**:
- **Role**:
- **Background**: [relevant experience, previous roles]
- **LinkedIn**: [URL if found]
- **Communication Style**: [inferred from online presence]

## Operations Assessment
- **Current Ordering**: [what you found — digital, phone, platform]
- **Supplier Indicators**: [any mentions of suppliers, sourcing]
- **Tech Stack**: [POS, delivery platforms, online ordering]
- **Pain Points**: [from reviews, operational signals]

## Outreach Angles
1. **[Angle Name]**: [specific hook + why it would resonate]
2. **[Angle Name]**: [specific hook + why it would resonate]

## Research Confidence: [High / Medium / Low]
[Brief note on what was easy to find vs. gaps]
```

## Constraints

- Never fabricate information. If you didn't find it, say "not found" — don't guess
- Never include personal contact information (phone, personal email) — only professional/public info
- Stay focused on THIS restaurant — don't pad the brief with generic industry information
- All findings must include the source (which URL/search provided this)
- Maximum 10 tool actions total — work efficiently
===PROMPT_END===
```

**↑ Cała treść powyżej trafia do `export const ARCHITECT_AGENT_EXAMPLE` w `v2.ts`**

---

## 6. Zmiany per-package — Kompletny Kod

---

### 6.1 shared package

#### [MODIFY] `constants.ts`

```diff
+// ── Prompt Architect V2 Config ──────────────────────
+export const ARCHITECT_CONFIG = {
+  model: 'claude-opus-4-6' as const,
+  fallbackModel: 'claude-sonnet-4-5' as const,
+  temperature: 0.4,
+  maxTokens: 8192,                    // usage limit dla architekta (nie capability modelu)
+  outputMarkers: {
+    start: '===PROMPT_START===',
+    end: '===PROMPT_END===',
+  },
+} as const;

 export const MODEL_CONFIG = {
+  'claude-opus-4-6': {
+    provider: 'anthropic',
+    quality: 'best',
+    costPer1KInput: 0.015,           // TODO: Verify current Anthropic pricing before deploy
+    costPer1KOutput: 0.075,          // TODO: Verify current Anthropic pricing before deploy
+    maxTokens: 16384,                // ❗ UWAGA: pole w kodzie to maxTokens, NIE maxOutputTokens
+  },
   'claude-sonnet-4-5': {
     // ...existing
   },
   // ...existing
 };
```

---

### 6.2 llm-gateway package

#### [MODIFY] `types.ts`

> **UWAGA:** Poniższe zmiany zastępują hardcoded ModelId / LLMProviderName (patrz sekcja 2.5).

```diff
-export type LLMProviderName = 'anthropic' | 'openai';
+export type LLMProviderName = 'anthropic' | 'openai' | 'ollama' | (string & {});

-export type AnthropicModelId = 'claude-sonnet-4-5';
-export type OpenAIModelId = 'gpt-4o-mini';
-export type ModelId = AnthropicModelId | OpenAIModelId;
+export type ModelId = string;

 // ── Generate Params ────────────────────────────────

 export interface LLMGenerateParams {
-  prompt: string;
+  prompt?: string;
+  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
   systemPrompt?: string;
-  model?: ModelId | 'auto';
+  model?: string | 'auto';
   quality?: QualityTier;
   complexity?: TaskComplexity;
   maxTokens?: number;
   temperature?: number;
+  purpose?: 'general' | 'prompt-architect';
 }

 // ── Provider Generate Params ────────────────────────

 export interface ProviderGenerateParams {
   prompt: string;
+  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
   systemPrompt?: string;
   model: string;
   maxTokens: number;
   temperature: number;
 }
```

> **KLUCZ:** Dodanie `messages` do `ProviderGenerateParams` jest **krytyczne** —
> bez tego providery (anthropic.ts, openai.ts) nie zobaczą multi-turn messages.
> `prompt` staje się opcjonalny w `LLMGenerateParams` (runtime check w gateway).
> `prompt` pozostaje wymagany w `ProviderGenerateParams` (backward compat — zawsze ustawiany przez gateway).

#### [MODIFY] `router.ts`

> **UWAGA:** `MODEL_REGISTRY` jest teraz dynamiczny (patrz sekcja 2.5 — `BUILTIN_MODELS` + `registerModel`).
> Poniżej tylko zmiany **specyficzne** dla Prompt Architect.

```diff
 // W BUILTIN_MODELS (nowy wpis na początku):
+  {
+    id: 'claude-opus-4-6',
+    provider: 'anthropic',
+    quality: 'best',
+    costPer1KInput: 0.015,             // TODO: Verify current Anthropic pricing before deploy
+    costPer1KOutput: 0.075,            // TODO: Verify current Anthropic pricing before deploy
+    maxTokens: 16384,                  // ❗ UWAGA: pole to maxTokens, NIE maxOutputTokens
+  },

 // Shorthand:
+const MODEL_SHORTHAND: Record<string, string> = {
+  claude: 'claude-sonnet-4-5',
+  'claude-opus': 'claude-opus-4-6',
+  gpt: 'gpt-4o-mini',
+};

-const FALLBACK_ORDER: ModelId[] = ['claude-sonnet-4-5', 'gpt-4o-mini'];
+const FALLBACK_ORDER: string[] = ['claude-opus-4-6', 'claude-sonnet-4-5', 'gpt-4o-mini'];

 selectModel(params: {
-  model?: ModelId | 'auto' | string;
+  model?: string | 'auto';
   quality?: QualityTier;
   complexity?: TaskComplexity;
+  purpose?: 'general' | 'prompt-architect';
 }): ModelSelection {
+  // 0. Purpose-based override (highest priority)
+  if (params.purpose === 'prompt-architect') {
+    const opus = this.findModel('claude-opus-4-6');
+    if (opus && this.isProviderAvailable(opus.provider)) {
+      return {
+        model: opus.id,
+        provider: opus.provider,
+        config: opus,
+        reason: 'purpose:prompt-architect',
+      };
+    }
+    const sonnet = this.findModel('claude-sonnet-4-5');
+    if (sonnet && this.isProviderAvailable(sonnet.provider)) {
+      return {
+        model: sonnet.id,
+        provider: sonnet.provider,
+        config: sonnet,
+        reason: 'purpose:prompt-architect:fallback-to-sonnet',
+      };
+    }
+    // Cloud providers unavailable — fall through to fallback chain
+    // (may pick up a local model if one is registered)
+  }
   // 1. Explicit model specified (existing logic continues unchanged)
   // ...
```

#### [MODIFY] `gateway.ts`

**Zmiana 1 — router call (purpose passthrough):**

```diff
 const selection = this.router.selectModel({
   model: params.model,
   quality: params.quality,
   complexity: params.complexity,
+  purpose: params.purpose,
 });
```

**Zmiana 2 — `executeWithRetry` — przekazanie messages + prompt do providera:**

> ❗ **KRYTYCZNE:** W aktualnym kodzie (`gateway.ts` linia 193) `executeWithRetry` buduje payload
> do `provider.generate()`. Tu MUSI być dodane `messages`.

```diff
 private async executeWithRetry(
   providerName: LLMProviderName,
   model: string,
   params: LLMGenerateParams,
   modelMaxTokens: number,
 ) {
   // ...rate limit + circuit breaker checks...

   for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
     try {
       this.rateLimiter.recordRequest(providerName);

+      // Build prompt from messages if not provided directly
+      const effectivePrompt = params.prompt
+        ?? params.messages?.[params.messages.length - 1]?.content
+        ?? '';
+
       const result = await provider.generate({
-        prompt: params.prompt,
+        prompt: effectivePrompt,
+        messages: params.messages,
         systemPrompt: params.systemPrompt,
         model,
         maxTokens: params.maxTokens ?? modelMaxTokens,
         temperature: params.temperature ?? 0.7,
       });
```

> **UWAGA:** `temperature` — zweryfikowane w kodzie (`gateway.ts` linia 198): 
> **JUŻ jest `params.temperature ?? 0.7`** — nie wymaga zmian.

#### [MODIFY] `providers/anthropic.ts` — obsługa multi-turn messages

```diff
 async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
   try {
     const response = await this.client.messages.create({
       model: params.model,
       max_tokens: params.maxTokens,
       temperature: params.temperature,
       ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
-      messages: [
-        {
-          role: 'user',
-          content: params.prompt,
-        },
-      ],
+      messages: params.messages?.map(m => ({ role: m.role, content: m.content }))
+        ?? [{ role: 'user' as const, content: params.prompt }],
     });
```

#### [MODIFY] `providers/openai.ts` — obsługa multi-turn messages

```diff
 async generate(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
   try {
     const messages: OpenAI.ChatCompletionMessageParam[] = [];

     if (params.systemPrompt) {
       messages.push({ role: 'system', content: params.systemPrompt });
     }
-    messages.push({ role: 'user', content: params.prompt });
+    if (params.messages && params.messages.length > 0) {
+      messages.push(
+        ...params.messages.map(m => ({
+          role: m.role as 'user' | 'assistant',
+          content: m.content,
+        })),
+      );
+    } else {
+      messages.push({ role: 'user', content: params.prompt });
+    }
```

---

### 6.3 prompt-architect package

#### [NEW] `v2.ts`

Ten plik eksportuje:

```typescript
// ── System Prompt ─────────────────────────────────────
export const PROMPT_ARCHITECT_V2 = `...`;
// Wklej cały tekst z SEKCJI 4 tego dokumentu (od "You are Prompt Architect" do końca)

// ── Agent Few-Shot Example (ładowany warunkowo) ──────
export const ARCHITECT_AGENT_EXAMPLE = `...`;
// Wklej cały tekst z SEKCJI 5, Przykład B tego dokumentu

// ── Interfaces ────────────────────────────────────────
export interface ArchitectOutput { ... }
export interface BuildArchitectInputParams { ... }
export interface BuildArchitectFollowUpParams { ... }

// ── Functions ─────────────────────────────────────────
export function buildArchitectInput(params: BuildArchitectInputParams): string { ... }
export function buildArchitectFollowUp(params: BuildArchitectFollowUpParams): { ... }
export function parseArchitectOutput(raw: string): ArchitectOutput { ... }
export function isArchitectQuestion(output: string): boolean { ... }
```

Pełny kod wszystkich interfejsów i funkcji jest w **sekcji 3** tego dokumentu (Pipeline Flow).

#### [MODIFY] `index.ts`

```diff
+// ── V2 Pipeline ─────────────────────────────────────
+export {
+  PROMPT_ARCHITECT_V2,
+  ARCHITECT_AGENT_EXAMPLE,
+  buildArchitectInput,
+  buildArchitectFollowUp,
+  parseArchitectOutput,
+  isArchitectQuestion,
+} from './v2.js';
+export type {
+  ArchitectOutput,
+  BuildArchitectInputParams,
+  BuildArchitectFollowUpParams,
+} from './v2.js';
```

Istniejące eksporty zostają (backward compat). Dodaj `@deprecated` JSDoc do `ExpertIdentifier` i `PromptGenerator`.

#### [MODIFY] `package.json`

```diff
 "exports": {
   ".": {
     "import": "./dist/index.js",
     "types": "./dist/index.d.ts"
+  },
+  "./v2": {
+    "import": "./dist/v2.js",
+    "types": "./dist/v2.d.ts"
   }
 },
```

---

### 6.4 api package

#### [NEW] Helper: `chunkString()` (dodaj do `tasks.ts` lub wydziel do utils)

```typescript
/** Split text into chunks of max `size` characters for SSE streaming */
function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}
```

#### [NEW] Interface: `FileAttachment` (dodaj do `@agentforge/shared/types`)

```typescript
export interface FileAttachment {
  name: string;
  mimeType: string;  // np. 'text/plain', 'image/png'
  content: string;
  size?: number;
}
```

#### [MODIFY] `tasks.ts`

**Zmiana importów:**

```diff
-import { ExpertIdentifier, PromptGenerator } from '@agentforge/prompt-architect';
+import {
+  PROMPT_ARCHITECT_V2,
+  buildArchitectInput,
+  buildArchitectFollowUp,
+  parseArchitectOutput,
+  isArchitectQuestion,
+} from '@agentforge/prompt-architect';
+import { ARCHITECT_CONFIG } from '@agentforge/shared';
```

**Zmiana request interface:**

```diff
 interface TaskStreamBody {
   task: string;
   options?: {
     model?: string;
+    generationType?: 'skill' | 'agent';
+    isArchitectFollowUp?: boolean;
+    architectHistory?: Array<{
+      role: 'user' | 'assistant';
+      content: string;
+    }>;
   };
+  files?: FileAttachment[];
 }
```

**Nowy early-return na POCZĄTKU route handler (PRZED krokiem 1):**

```typescript
// ═══════════════════════════════════════════════════════
// ARCHITECT FOLLOW-UP — skip kroki 1-8
// Gdy user odpowiada na pytania architekta, nie potrzebujemy
// ponownej klasyfikacji, skill matching, etc.
// ═══════════════════════════════════════════════════════

if (options?.isArchitectFollowUp) {
  const generationType = options?.generationType ?? 'skill';
  const rawFiles: FileAttachment[] = req.body.files ?? [];

  const followUp = buildArchitectFollowUp({
    userAnswer: task,
    previousMessages: options.architectHistory ?? [],
    files: rawFiles,
    generationType,
  });

  reply.raw.write(sseEvent('step', {
    step: 'architect',
    status: 'running',
    label: 'Generating prompt from your clarifications',
  }));

  const architectResult = await gateway.generate({
    messages: followUp.messages,
    systemPrompt: PROMPT_ARCHITECT_V2,
    purpose: 'prompt-architect',
    temperature: ARCHITECT_CONFIG.temperature,
    maxTokens: ARCHITECT_CONFIG.maxTokens,
  });

  reply.raw.write(sseEvent('step', {
    step: 'architect',
    status: 'done',
    label: 'Generating prompt from your clarifications',
  }));

  // Jeśli architekt pyta WIĘCEJ (rzadkie ale możliwe)
  if (isArchitectQuestion(architectResult.content)) {
    reply.raw.write(sseEvent('architect_questions', {
      questions: architectResult.content,
      requiresFollowUp: true,
    }));
    for (const chunk of chunkString(architectResult.content, 50)) {
      reply.raw.write(sseEvent('token', { content: chunk }));
    }
    reply.raw.write(sseEvent('done', { status: 'awaiting_input' }));
    return;
  }

  // Wygenerował prompt — dostarcz
  const parsed = parseArchitectOutput(architectResult.content);
  for (const chunk of chunkString(architectResult.content, 50)) {
    reply.raw.write(sseEvent('token', { content: chunk }));
  }
  reply.raw.write(sseEvent('done', {
    status: 'complete',
    type: parsed.type,
    isDeliverable: true,
  }));
  return;
}

// ── Normalny flow ──
// Krok 1: strip prefix...
```

**Zastąpienie bloku `create_new` (~linie 202-225):**

```typescript
// ═══════════════════════════════════════════════════════
// KROK 9+10 (MERGED) — Prompt Architect V2
// STARY KOD (usunięty):
//   const expertIdentifier = new ExpertIdentifier();
//   const expertProfile = expertIdentifier.identify({...});
//   const promptGenerator = new PromptGenerator();
//   const generatedPrompt = promptGenerator.generate({...}, expertProfile);
//   systemPrompt = generatedPrompt.content;
// ═══════════════════════════════════════════════════════

if (execResult.routing.action === 'create_new') {
  try {
    // Pliki: wyciągnij z request body OSOBNO od ContextBuilder.
    // ContextBuilder pakuje je do finalnego prompt (krok 11).
    // Architect potrzebuje ich RÓWNIEŻ — do analizy stylu/tonu/terminologii.
    const rawFiles: FileAttachment[] = req.body.files ?? [];

    const generationType = options?.generationType ?? 'skill';
    const isDeliverableMode = options?.generationType === 'skill'
                           || options?.generationType === 'agent';

    reply.raw.write(sseEvent('step', {
      step: 'architect',
      status: 'running',
      label: isDeliverableMode
        ? `Generating ${generationType} prompt`
        : 'Designing expert system prompt',
    }));

    const architectInput = buildArchitectInput({
      task: cleanTask,
      files: rawFiles,
      conversationContext: builtContext.prompt,
      classification: execResult.classification,
      generationType,
    });

    const architectResult = await gateway.generate({
      prompt: architectInput,
      systemPrompt: PROMPT_ARCHITECT_V2,
      purpose: 'prompt-architect',
      temperature: ARCHITECT_CONFIG.temperature,
      maxTokens: ARCHITECT_CONFIG.maxTokens,
    });

    reply.raw.write(sseEvent('step', {
      step: 'architect',
      status: 'done',
      label: isDeliverableMode
        ? `Generating ${generationType} prompt`
        : 'Designing expert system prompt',
    }));

    // ── Architect zadał pytania ──
    if (isArchitectQuestion(architectResult.content)) {
      reply.raw.write(sseEvent('architect_questions', {
        questions: architectResult.content,
        requiresFollowUp: true,
      }));
      for (const chunk of chunkString(architectResult.content, 50)) {
        reply.raw.write(sseEvent('token', { content: chunk }));
      }
      reply.raw.write(sseEvent('done', { status: 'awaiting_input' }));
      return;
    }

    const parsed = parseArchitectOutput(architectResult.content);

    // ── USE CASE A: Prompt jako deliverable ──
    if (isDeliverableMode) {
      for (const chunk of chunkString(architectResult.content, 50)) {
        reply.raw.write(sseEvent('token', { content: chunk }));
      }
      reply.raw.write(sseEvent('done', {
        status: 'complete',
        type: parsed.type,
        isDeliverable: true,
      }));
      return; // SKIP krok 11
    }

    // ── USE CASE B: System prompt jako intermediate ──
    systemPrompt = parsed.generatedPrompt;
    // → Continue to krok 11

  } catch (err) {
    logger.error('Architect V2 failed, using fallback:', err);
    // Fallback to generic system prompt (już ustawiony wcześniej)
  }
}

// ── KROK 11 (bez zmian) ──
```

---

### 6.5 Frontend (Chat UI) — wymagane zmiany

**1. Przyciski [Generate Skill] i [Generate Agent]**

```typescript
// Przy wysyłaniu requesta z przycisku:
body: {
  task: userMessage,
  options: {
    generationType: 'skill',  // lub 'agent' — zależy od klikniętego przycisku
  },
  files: attachedFiles,
}
```

**2. Obsługa SSE event `architect_questions`**

Gdy backend wysyła `architect_questions`:
- Wyświetl pytania w chacie jako wiadomość od asystenta
- Przy następnej odpowiedzi usera dodaj do body:

```typescript
body: {
  task: userAnswer,
  options: {
    isArchitectFollowUp: true,
    generationType: originalGenerationType,
    architectHistory: [
      { role: 'user', content: originalRequest },
      { role: 'assistant', content: architectQuestionsText },
    ],
  },
  files: originalFiles,  // zachowaj oryginalne pliki
}
```

**3. Renderowanie deliverable**

Gdy SSE `done` zawiera `isDeliverable: true`:
- Znajdź markery `===PROMPT_START===` / `===PROMPT_END===` w response
- Renderuj prompt w code block z przyciskiem **"Copy"**
- Renderuj brief (przed markerami) i deployment note (po markerami) jako normalny tekst

---

## 7. Verification Plan

### Automated Tests

**1. Istniejące testy ModelRouter (MUSZĄ przejść)**

```bash
cd packages/llm-gateway && npx vitest run src/__tests__/router.test.ts
```

**2. Nowe testy: purpose routing** (dodaj do `router.test.ts`)

```typescript
describe('purpose-based routing', () => {
  it('purpose: prompt-architect → claude-opus-4-6', () => {
    const result = router.selectModel({ purpose: 'prompt-architect' });
    expect(result.model).toBe('claude-opus-4-6');
    expect(result.reason).toBe('purpose:prompt-architect');
  });

  it('purpose: prompt-architect fallback when anthropic unavailable', () => {
    // mock anthropic as unavailable
    const result = router.selectModel({ purpose: 'prompt-architect' });
    expect(result.reason).toContain('fallback');
  });

  it('purpose: undefined → no change to existing logic', () => {
    const result = router.selectModel({ complexity: 'simple' });
    expect(result.model).toBe('gpt-4o-mini');
  });
});
```

**3. Nowe testy: v2 functions** (nowy plik `prompt-architect/src/__tests__/v2.test.ts`)

```typescript
describe('parseArchitectOutput', () => {
  it('parses output with markers correctly', () => {
    const raw = 'Brief here\n\n===PROMPT_START===\n## Identity\nYou are...\n===PROMPT_END===\n\nDeploy note';
    const result = parseArchitectOutput(raw);
    expect(result.brief).toBe('Brief here');
    expect(result.generatedPrompt).toContain('## Identity');
    expect(result.deploymentNote).toBe('Deploy note');
    expect(result.type).toBe('skill');
  });

  it('detects agent type from content', () => {
    const raw = '===PROMPT_START===\n## Available Tools\n- search\n## Decision Protocol\n...\n===PROMPT_END===';
    const result = parseArchitectOutput(raw);
    expect(result.type).toBe('agent');
  });

  it('fallback: no markers → entire output is prompt', () => {
    const raw = '## Identity\nYou are a helpful assistant';
    const result = parseArchitectOutput(raw);
    expect(result.generatedPrompt).toBe(raw);
    expect(result.brief).toBe('');
  });
});

describe('isArchitectQuestion', () => {
  it('returns true when no markers present', () => {
    expect(isArchitectQuestion('I have a few questions...')).toBe(true);
  });

  it('returns false when markers present', () => {
    expect(isArchitectQuestion('===PROMPT_START===\ncontent\n===PROMPT_END===')).toBe(false);
  });
});

describe('buildArchitectInput', () => {
  it('includes all provided sections', () => {
    const result = buildArchitectInput({
      task: 'Build a LinkedIn responder',
      files: [{ name: 'profile.txt', mimeType: 'text/plain', content: 'Chef bio...' }],
      conversationContext: 'Previous chat...',
      classification: { domain: ['marketing'], complexity: 'medium', keywords: ['linkedin'] },
      generationType: 'skill',
    });
    expect(result).toContain('<user_request>');
    expect(result).toContain('<generation_type>skill</generation_type>');
    expect(result).toContain('<user_files>');
    expect(result).toContain('<conversation_context>');
    expect(result).toContain('<orchestrator_hints>');
    expect(result).not.toContain('<reference_example_agent>');
  });

  it('includes agent example when generationType is agent', () => {
    const result = buildArchitectInput({
      task: 'Build a research agent',
      files: [],
      generationType: 'agent',
    });
    expect(result).toContain('<reference_example_agent>');
  });
});
```

**4. Istniejące testy gateway (MUSZĄ przejść)**

```bash
cd packages/llm-gateway && npx vitest run src/__tests__/gateway.test.ts
```

**5. Pełny build monorepo**

```bash
cd /projekty/AGENT-FORGE && pnpm build
```

### Manual Verification

> [!CAUTION]
> Wymaga działających kluczy API (Anthropic z dostępem do Claude Opus).

**Test 1: Use Case A — Skill Generation (deliverable mode)**

```
1. pnpm dev:all
2. http://localhost:3000 → Chat
3. Kliknij [Generate Skill]
4. Wpisz: "Chcę prompt który pomoże mi odpowiadać na komentarze na LinkedIn.
   Jestem chef który przeszedł do tech, buduję SaaS dla gastronomii."
5. OCZEKIWANE:
   - SSE step: "Generating skill prompt" → running → done
   - Response zawiera brief + prompt w markerach + deployment note
   - Prompt zawiera specyficzną personę (nie generyczną)
   - Prompt zawiera sekcję Examples z positive + negative
   - Krok 11 NIE wykonuje się
```

Jeśli przycisk nie istnieje w UI — zasymuluj:

```bash
curl -X POST http://localhost:3001/tasks/stream \
  -H "Content-Type: application/json" \
  -d '{"task":"Chcę prompt do odpowiadania na LinkedIn komentarze","options":{"generationType":"skill"}}'
```

**Test 2: Use Case A — Agent Generation**

```
1. Kliknij [Generate Agent]
2. Wpisz: "Agent który przeszuka internet i zbierze informacje o restauracji przed cold outreach"
3. OCZEKIWANE:
   - Prompt zawiera: ## Available Tools, ## Decision Protocol, ## Error Handling
   - type w SSE done event = 'agent'
```

**Test 3: Use Case B — Normal task (backward compat)**

```
1. Normalny chat (bez przycisków)
2. Wpisz: "Przeanalizuj zalety i wady migracji z MongoDB do PostgreSQL"
3. OCZEKIWANE:
   - Jeśli routing = create_new → architekt generuje system prompt
   - Krok 11 WYKONUJE się → dostajemy analizę (nie prompt)
```

**Test 4: Architect asks questions**

```
1. [Generate Skill]
2. Wpisz: "zrób mi coś do emaili"
3. OCZEKIWANE: Architekt pyta 1-2 pytania
4. Odpowiedz: "Chodzi o cold outreach do restauracji, formalny ton, po angielsku"
5. OCZEKIWANE: Architekt generuje prompt BEZ ponownej klasyfikacji
```

**Test 5: Pliki wpływają na prompt**

```
1. [Generate Skill]
2. Załącz plik z przykładami swoich LinkedIn komentarzy
3. Wpisz: "Zrób prompt do pisania komentarzy w moim stylu"
4. OCZEKIWANE: Wygenerowany prompt zawiera elementy z pliku (ton, styl)
```

---

## 8. Risk Assessment & Implementation Order

### Ryzyka

| Risk | Impact | Mitigation |
|---|---|---|
| Brak API key / dostępu do Opus | **Blocker** | Fallback: Opus → Sonnet → GPT-4o-mini → Ollama. Sprawdź klucze PRZED implementacją |
| Opus drogi (premium call per prompt generation) | **Średni** | ARCHITECT_CONFIG pozwala zmienić model. Monitor via CostTracker |
| Frontend nie ma przycisków Skill/Agent | **Niski** | Backend działa, testuj via curl |
| ~~Gateway nie respektuje temperature override~~ | ~~Średni~~ | ✅ Zweryfikowane: `params.temperature ?? 0.7` JUŻ istnieje |
| ~~Multi-turn messages nie wspierane~~ | ~~Średni~~ | ✅ Rozwiązane w sekcji 6.2: `messages` dodane do `ProviderGenerateParams` + oba providery |
| Ollama serwer niedostępny / wolny | **Niski** | CircuitBreaker → OPEN → fallback chain |
| Lokalne modele gorsze dla gen. promptów | **Średni** | `purpose: 'prompt-architect'` preferuje Opus/Sonnet. Lokalne jako fallback |
| `ModelId = string` mniejsze type safety | **Niski** | Tradeoff: extensibility > safety. `MODEL_SHORTHAND` daje autocomplete |

### Kolejność implementacji — FAZY

> Każda faza jest **niezależnym, testowalnym deliverable**.
> Po każdej fazie: `pnpm build` musi przejść, istniejące testy nie mogą się złamać.
> Branch: `feature/prompt-architect-v2` → merge po fazie 5.

---

#### ✅ FAZA 1 — Foundation (shared + types) · ~30 min · DONE

**Cel:** Przygotować typy i konfigurację. Zero zmian w logice runtime.

```
Pliki:
  1. shared/src/constants.ts           ← ARCHITECT_CONFIG + claude-opus MODEL_CONFIG
  2. shared/src/types/index.ts         ← FileAttachment interface
  3. shared/src/validators/index.ts    ← Zod: model→z.string(), generationType, architectHistory
  4. llm-gateway/src/types.ts          ← ModelId→string, LLMProviderName extensible,
                                          messages w LLMGenerateParams + ProviderGenerateParams
```

**Weryfikacja:**
- `pnpm build` — kompilacja przejdzie (typy backward-compatible)
- `pnpm -F @agentforge/llm-gateway test` — istniejące testy przechodzą

---

#### ✅ FAZA 2 — Gateway & Providers · ~75 min · DONE

**Cel:** Gateway obsługuje `messages[]`, `purpose`, dynamicznych providerów + Ollama.
Istniejące callery (bez `messages`) działają identycznie.

```
Pliki:
  5. llm-gateway/providers/ollama.ts   ← [NEW] OpenAI-compatible local provider
  6. llm-gateway/providers/index.ts    ← Map + registerProvider() + OllamaProvider
  7. llm-gateway/providers/anthropic.ts← messages[] multi-turn support
  8. llm-gateway/providers/openai.ts   ← messages[] multi-turn support
  9. llm-gateway/router.ts             ← BUILTIN_MODELS + registerModel() + Opus + purpose routing
 10. llm-gateway/gateway.ts            ← purpose passthrough + messages w executeWithRetry
```

**Weryfikacja:**
- `pnpm -F @agentforge/llm-gateway test` — istniejące testy
- Nowe testy w `router.test.ts`: purpose routing, registerModel()
- (Opcjonalnie) Manual test z Ollama: `docker run -d -p 11434:11434 ollama/ollama`

> **BLOCKER CHECK:** Czy masz klucz API Anthropic dla claude-opus-4-6? Jeśli nie → Sonnet/GPT fallback OK.

---

#### FAZA 3 — Prompt Architect V2 Package · ~90 min · Ryzyko: NISKIE

**Cel:** Samodzielny pakiet z system promptem, helperami, interfejsami. Nie podłączony do pipeline.

```
Pliki:
 11. prompt-architect/src/v2.ts        ← PROMPT_ARCHITECT_V2 system prompt + ARCHITECT_AGENT_EXAMPLE
                                          ArchitectOutput, BuildArchitectInputParams interfaces
                                          buildArchitectInput(), parseArchitectOutput(),
                                          buildArchitectFollowUp(), isArchitectQuestion()
 12. prompt-architect/src/index.ts     ← eksporty V2 + @deprecated na V1
 13. prompt-architect/package.json     ← subpath export ./v2
```

**Weryfikacja:**
- `pnpm build`
- Nowe testy `v2.test.ts`: parseArchitectOutput(), buildArchitectInput(), isArchitectQuestion()

---

#### FAZA 4 — Pipeline Integration · ~60 min · Ryzyko: ŚREDNIE

**Cel:** Podłączyć V2 do API. End-to-end flow działa via curl.

```
Pliki:
 14. api/src/routes/tasks.ts           ← nowe importy, architect follow-up,
                                          buildArchitectInput() + gateway.generate(purpose),
                                          parseArchitectOutput(), Use Case A vs B routing,
                                          chunkString(), SSE events: content: chunk
```

**Weryfikacja:**

```bash
# Test backward compat (Use Case B):
curl -N http://localhost:3001/tasks/stream \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"task":"Napisz podsumowanie artykułu o AI"}'
# → normalny SSE stream, pipeline jak wcześniej

# Test Use Case A (Skill generation):
curl -N http://localhost:3001/tasks/stream \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"task":"Prompt do odpowiadania na LinkedIn","options":{"generationType":"skill"}}'
# → deliverable prompt w markerach, krok 11 NIE wykonuje się
```

> **MVP READY:** Po Fazie 4 backend jest w pełni funkcjonalny. Frontend to bonus.

---

#### ✅ FAZA 5 — Frontend UI · DONE

**Cel:** Przyciski Skill/Agent w chacie, rendering deliverable prompts, follow-up flow.

```
Pliki zmienione:
 15. web/src/types/chat.ts                 ← architect step, ArchitectState, SSE events, new actions
 16. web/src/lib/api.ts                    ← architect_questions SSE handler
 17. web/src/components/chat/pipeline-indicator.tsx ← Wand2 icon for architect step
 18. web/src/components/chat/chat-input.tsx ← [Generate Skill] [Generate Agent] buttons, follow-up mode
 19. web/src/components/chat/message-list.tsx ← DeliverableContent with prompt extraction + Copy
 20. web/src/app/(dashboard)/page.tsx       ← architect reducer, handleGenerate, SSE handler, follow-up state
```

**Weryfikacja:** `tsc --noEmit` ✅ (0 nowych błędów)

---

#### Podsumowanie faz

| Faza | Scope | Czas | Ryzyko | Deliverable |
|------|-------|------|--------|-------------|
| **1** | Types & config | ~30 min | Zerowe | Typy + konfiguracja gotowe |
| **2** | Gateway + providers | ~75 min | Niskie | Multi-turn + Ollama + purpose routing |
| **3** | Prompt Architect V2 | ~90 min | Niskie | Samodzielny pakiet z system promptem |
| **4** | API pipeline | ~60 min | Średnie | **Backend MVP** — e2e via curl |
| **5** | Frontend UI | ~60 min | Niskie | Pełny UI z przyciskami i follow-up |

**TOTAL: ~5h** · **MVP (bez UI): ~4h** (Fazy 1-4)

### File Change Summary

```
PLIKI NOWE:
  packages/prompt-architect/src/v2.ts
  packages/llm-gateway/src/providers/ollama.ts

PLIKI ZMIENIONE:
  packages/prompt-architect/src/index.ts
  packages/prompt-architect/package.json
  packages/llm-gateway/src/types.ts               ← ModelId→string, LLMProviderName extensible,
                                                     messages w LLMGenerateParams + ProviderGenerateParams
  packages/llm-gateway/src/router.ts               ← Opus + purpose routing + dynamic registry
  packages/llm-gateway/src/gateway.ts              ← purpose passthrough + messages w executeWithRetry
  packages/llm-gateway/src/providers/index.ts      ← Map + registerProvider() + OllamaProvider
  packages/llm-gateway/src/providers/anthropic.ts  ← messages[] multi-turn support
  packages/llm-gateway/src/providers/openai.ts     ← messages[] multi-turn support
  packages/shared/src/constants.ts                 ← ARCHITECT_CONFIG + claude-opus MODEL_CONFIG
  packages/shared/src/types/index.ts               ← FileAttachment interface
  packages/shared/src/validators/index.ts          ← Zod: model→string, generationType, architectHistory
  packages/api/src/routes/tasks.ts                 ← główna zmiana pipeline + chunkString helper

PLIKI TESTOWE (nowe/zmienione):
  packages/prompt-architect/src/__tests__/v2.test.ts
  packages/llm-gateway/src/__tests__/router.test.ts (append purpose-based routing tests)

PLIKI DEPRECATED (nie usunięte):
  packages/prompt-architect/src/expert-identifier.ts  → @deprecated JSDoc
  packages/prompt-architect/src/prompt-generator.ts   → @deprecated JSDoc

PLIKI BEZ ZMIAN:
  packages/orchestrator/*
  packages/skill-library/*
  packages/memory/*
  packages/prompt-architect/src/validator.ts
```

