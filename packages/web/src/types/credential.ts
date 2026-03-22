// ── Credential Types (Frontend) ─────────────────────

export interface Credential {
  id: string;
  service: string;
  maskedKey: string;
  createdAt: string;
}

export interface CreateCredentialPayload {
  service: string;
  apiKey: string;
}

// ── Constants ───────────────────────────────────────

export const CREDENTIAL_SERVICES = [
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic', icon: '🧠' },
  { value: 'google-ai', label: 'Google AI', icon: '🔮' },
  { value: 'voyage-ai', label: 'Voyage AI', icon: '🚀' },
  { value: 'cohere', label: 'Cohere', icon: '🌊' },
  { value: 'replicate', label: 'Replicate', icon: '🔄' },
  { value: 'huggingface', label: 'Hugging Face', icon: '🤗' },
  { value: 'github', label: 'GitHub', icon: '🐙' },
  { value: 'custom', label: 'Custom', icon: '🔧' },
] as const;

export type CredentialServiceValue = typeof CREDENTIAL_SERVICES[number]['value'];

// ── Service color map ───────────────────────────────

export const SERVICE_COLORS: Record<string, string> = {
  openai: 'from-emerald-500 to-green-400',
  anthropic: 'from-amber-500 to-orange-400',
  'google-ai': 'from-blue-500 to-cyan-400',
  'voyage-ai': 'from-violet-500 to-purple-400',
  cohere: 'from-teal-500 to-cyan-400',
  replicate: 'from-pink-500 to-rose-400',
  huggingface: 'from-yellow-500 to-amber-400',
  github: 'from-gray-500 to-slate-400',
  custom: 'from-indigo-500 to-blue-400',
};
