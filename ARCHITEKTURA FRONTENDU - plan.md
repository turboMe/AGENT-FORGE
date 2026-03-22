## ARCHITEKTURA FRONTENDU

```
agentforge/
├── packages/
│   ├── api/                    ← Istniejący backend (v1/v2)
│   ├── web/                    ← NOWY — Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            ← App Router (Next.js 15)
│   │   │   ├── components/     ← React components
│   │   │   ├── hooks/          ← Custom hooks
│   │   │   ├── lib/            ← API client, utils
│   │   │   └── types/          ← Shared TypeScript types
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── [istniejące pakiety]
```

Frontend komunikuje się z backendem wyłącznie przez REST API. Zero bezpośredniego dostępu do bazy. Czysta separacja.

---

## EKRANY I FUNKCJONALNOŚCI

### Ekran 1: Chat Interface (główny ekran)

**Cel:** Użytkownik wpisuje zadanie w języku naturalnym, widzi pipeline w akcji, dostaje wynik.

**Elementy:**
- Pole tekstowe na dole (jak ChatGPT/Claude)
- Upload plików: drag & drop lub przycisk (PDF, CSV, TXT, obrazy)
- Historia konwersacji po lewej stronie (lista poprzednich chatów)
- Główny panel: wiadomości user/agent z formatowaniem markdown
- Pipeline indicator: kiedy system przetwarza, pokaż kroki:
  - ⚡ Klasyfikuję zadanie...
  - 🔍 Szukam skilla w bibliotece...
  - 🎨 Tworzę nowego agenta...
  - ⚙️ Buduję automatyzację...
  - ✅ Gotowe

**API calls:**
- `POST /task` — wysłanie zadania
- Streaming response (SSE lub WebSocket) — żeby user widział postęp
- `POST /upload` — upload pliku (nowy endpoint do dodania w API)

**Kluczowe UX decyzje:**
- Domyślnie `/route` jest automatyczny — user NIE musi pisać /route
- Frontend dodaje prefix /route do każdego zadania przed wysłaniem do API
- Pipeline indicator jest opcjonalny — zaawansowany user może go włączyć/wyłączyć
- Upload pliku dodaje jego zawartość jako kontekst do zadania

---

### Ekran 2: Skill Library Browser

**Cel:** Przeglądanie, wyszukiwanie, zarządzanie biblioteką skilli i agentów.

**Elementy:**
- Search bar z filtrowaniem po: domain, type (skill/agent/automation), pattern
- Grid/List view skilli — każdy skill jako karta z:
  - Nazwa, ikona kategorii
  - Opis (1-2 linii)
  - Tagi (chips)
  - use_count, avg_satisfaction (gwiazdki)
  - Przycisk: "Użyj" (otwiera chat z tym skillem pre-loaded)
  - Przycisk: "Edytuj" (otwiera edytor SKILL.md)
  - Przycisk: "Usuń" (z potwierdzeniem)
- Przycisk "Nowy skill" → otwiera chat z promptem do tworzenia

**API calls:**
- `GET /skills` — lista skilli
- `GET /skills/search?q=email&domain=sales` — wyszukiwanie
- `DELETE /skills/:id` — usuwanie
- `PATCH /skills/:id` — edycja metadata

---

### Ekran 3: Workflow Dashboard

**Cel:** Zarządzanie aktywnymi automatyzacjami (workflows z n8n).

**Elementy:**
- Lista aktywnych workflow z:
  - Nazwa i opis (natural language)
  - Status: ✅ Active / ⏸️ Paused / ❌ Failed
  - Ostatnie uruchomienie: kiedy, wynik
  - Częstotliwość (co godzinę, codziennie, na webhook)
  - Szacowany koszt/miesiąc
  - Przyciski: Pause/Resume, Edit Params, View Logs, Delete
- Timeline uruchomień — wykres z historią (zielone=ok, czerwone=fail)
- Przycisk "Nowa automatyzacja" → otwiera chat

**API calls:**
- `GET /workflows` — lista workflow
- `GET /workflows/:id/executions` — historia uruchomień
- `PATCH /workflows/:id/params` — zmiana parametrów
- `PATCH /workflows/:id/status` — pause/resume
- `DELETE /workflows/:id` — usunięcie

---

### Ekran 4: Credential Manager

**Cel:** Zarządzanie kluczami API do zewnętrznych serwisów.

**Elementy:**
- Lista dodanych credentials: nazwa serwisu, data dodania, ostatnie użycie
- NIE pokazuj wartości kluczy — tylko masca (sk-ant-***...***4f2)
- Przycisk "Dodaj credential" → modal:
  - Dropdown: wybierz serwis (SendGrid, Slack, OpenAI, Custom...)
  - Pole: API key / token
  - Instrukcja: "Znajdź swój klucz na: [link do dokumentacji serwisu]"
- Przycisk "Usuń" z potwierdzeniem

**API calls:**
- `GET /credentials` — lista (same nazwy, zero wartości)
- `POST /credentials` — dodanie nowego
- `DELETE /credentials/:id` — usunięcie

**Bezpieczeństwo:**
- HTTPS always (nie HTTP)
- Klucz API przesyłany raz (POST) i nigdy nie wraca do frontendu
- Frontend NIGDY nie cachuje credentials
- Pole input type="password" — nie pokazuj wartości po wpisaniu

---

### Ekran 5: Marketplace (MVP)

**Cel:** Przeglądanie i instalowanie skilli od community.

**Wersja MVP (v2.5):**
- Read-only — przeglądaj i instaluj
- Grid skilli z: nazwa, autor, opis, rating, install count
- Przycisk "Zainstaluj" → kopiuje skill do biblioteki użytkownika
- Kategorie: Sales, Marketing, Engineering, Data, Content, Operations

**Pełna wersja (v3+):**
- Publish — użytkownik może opublikować swój skill
- Pricing — skille mogą być płatne ($5-$50)
- Revenue share — 70% twórca, 30% AgentForge
- Reviews i ratings
- Wersjonowanie (v1.0, v1.1, v2.0)

**API calls (nowe — do dodania w API):**
- `GET /marketplace/skills` — lista public skilli
- `POST /marketplace/skills/:id/install` — instalacja
- `POST /marketplace/skills` — publikacja (v3+)

---

### Ekran 6: Settings & Billing

**Elementy:**
- Profil użytkownika (email, nazwa)
- Aktualny plan (Free / Pro / Team / Agency)
- Użycie: tasks this month / limit, active workflows / limit
- Upgrade przycisk → Stripe checkout
- Preferencje: język interfejsu, domyślny model LLM, pipeline indicator on/off
- API key management (dla programmatic access)

---

### Ekran 7: Decision Log / Analytics

**Cel:** Transparentność — pokaż użytkownikowi jak system działa.

**Elementy:**
- Lista decyzji: timestamp, zadanie, routing (use existing/adapt/create new), skill, score
- Filtry: po dacie, typie, domenie
- Wykresy:
  - Skills created over time
  - Retrieval hit rate (ile razy znaleziono istniejący skill vs tworzono nowy)
  - Top 10 most used skills
  - Average satisfaction over time
  - Cost per task over time

---
