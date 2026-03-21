// Letta REST API client
// Phase 6 implementation

export class LettaClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.LETTA_BASE_URL ?? 'http://localhost:8283';
  }

  // TODO: Implement Letta REST API client
}
