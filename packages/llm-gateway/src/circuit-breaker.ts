import type { CircuitBreakerConfig, CircuitState, LLMProviderName } from './types.js';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  lastAttemptTime: number;
}

export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private readonly circuits: Map<LLMProviderName, CircuitBreakerState> = new Map();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current state of a provider's circuit.
   */
  getState(provider: LLMProviderName): CircuitState {
    const circuit = this.getOrCreate(provider);
    this.maybeTransitionToHalfOpen(circuit);
    return circuit.state;
  }

  /**
   * Check if a request to this provider is allowed.
   */
  canRequest(provider: LLMProviderName): boolean {
    const state = this.getState(provider);
    return state !== 'OPEN';
  }

  /**
   * Record a successful request — resets the circuit to CLOSED.
   */
  recordSuccess(provider: LLMProviderName): void {
    const circuit = this.getOrCreate(provider);
    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.lastAttemptTime = Date.now();
  }

  /**
   * Record a failed request — may transition to OPEN.
   */
  recordFailure(provider: LLMProviderName): void {
    const circuit = this.getOrCreate(provider);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    circuit.lastAttemptTime = Date.now();

    if (circuit.failureCount >= this.config.failureThreshold) {
      circuit.state = 'OPEN';
    }
  }

  /**
   * Reset a specific provider circuit.
   */
  reset(provider: LLMProviderName): void {
    this.circuits.delete(provider);
  }

  /**
   * Reset all circuits.
   */
  resetAll(): void {
    this.circuits.clear();
  }

  private getOrCreate(provider: LLMProviderName): CircuitBreakerState {
    let circuit = this.circuits.get(provider);
    if (!circuit) {
      circuit = {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        lastAttemptTime: 0,
      };
      this.circuits.set(provider, circuit);
    }
    return circuit;
  }

  private maybeTransitionToHalfOpen(circuit: CircuitBreakerState): void {
    if (circuit.state !== 'OPEN') return;

    const elapsed = Date.now() - circuit.lastFailureTime;
    if (elapsed >= this.config.resetTimeoutMs) {
      circuit.state = 'HALF_OPEN';
    }
  }
}
