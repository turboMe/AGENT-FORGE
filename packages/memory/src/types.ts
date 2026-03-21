export interface MemoryContext {
  sessionId: string;
  relevantMemories: string[];
  lastInteraction?: Date;
}

export interface IMemoryService {
  getContext(userId: string, taskDescription: string): Promise<MemoryContext | null>;
  saveInteraction(userId: string, task: string, result: string): Promise<void>;
  searchMemory(userId: string, query: string): Promise<string[]>;
}
