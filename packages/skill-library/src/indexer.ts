import type { ISkill } from '@agentforge/shared';
import { SkillModel } from './skill.model.js';
import { EmbeddingService } from './embedding.js';
import type { EmbeddingConfig } from './types.js';

// ── Skill Indexer ───────────────────────────────────

export class SkillIndexer {
  private readonly embeddingService: EmbeddingService;

  constructor(embeddingConfig: EmbeddingConfig) {
    this.embeddingService = new EmbeddingService(embeddingConfig);
  }

  /**
   * Build searchVector text from a skill's fields.
   * Used for MongoDB text index ($text search).
   */
  buildSearchVector(
    skill: Pick<ISkill, 'name' | 'description' | 'domain' | 'tags' | 'template'>,
  ): string {
    const parts = [
      skill.name,
      skill.description,
      ...skill.domain,
      ...skill.tags,
      skill.template.persona,
      skill.template.outputFormat,
      ...skill.template.constraints,
      ...(skill.template.process ?? []),
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Index a single skill: generate searchVector + embedding, save both.
   */
  async indexSkill(skillId: string): Promise<void> {
    const doc = await SkillModel.findById(skillId);
    if (!doc) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Build text-based search vector
    const searchVector = this.buildSearchVector(doc);

    // Generate embedding from the text representation
    const embeddingText = this.embeddingService.buildEmbeddingText(doc);
    const embedding = await this.embeddingService.generateEmbedding(embeddingText);

    // Save both to document
    await SkillModel.updateOne(
      { _id: skillId },
      { $set: { searchVector, embedding } },
    );
  }

  /**
   * Reindex all skills for a given tenant.
   * Processes in batches to avoid overwhelming the embedding API.
   */
  async reindexAll(tenantId: string, batchSize = 10): Promise<{ indexed: number; failed: number }> {
    const skills = await SkillModel.find({ tenantId, deletedAt: null }).select('_id');

    let indexed = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < skills.length; i += batchSize) {
      const batch = skills.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((skill) => this.indexSkill(String(skill._id))),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          indexed++;
        } else {
          failed++;
        }
      }
    }

    return { indexed, failed };
  }
}
