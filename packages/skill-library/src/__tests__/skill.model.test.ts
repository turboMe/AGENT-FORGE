import { describe, it, expect, vi } from 'vitest';

// Mock mongoose before importing the model
vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    default: actual.default,
  };
});

describe('SkillModel', () => {
  it('should have the correct collection name', async () => {
    const { SkillModel } = await import('../skill.model.js');
    expect(SkillModel.collection.collectionName).toBe('skills');
  });

  it('should have all top-level schema paths', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const paths = Object.keys(SkillModel.schema.paths);

    expect(paths).toContain('tenantId');
    expect(paths).toContain('name');
    expect(paths).toContain('slug');
    expect(paths).toContain('description');
    expect(paths).toContain('domain');
    expect(paths).toContain('pattern');
    expect(paths).toContain('tags');
    expect(paths).toContain('template');
    expect(paths).toContain('version');
    expect(paths).toContain('isSystem');
    expect(paths).toContain('isPublic');
    expect(paths).toContain('stats');
    expect(paths).toContain('searchVector');
    expect(paths).toContain('embedding');
    expect(paths).toContain('createdBy');
    expect(paths).toContain('deletedAt');
    expect(paths).toContain('createdAt');
    expect(paths).toContain('updatedAt');
  });

  it('should have template sub-schema with correct fields', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const templateSchema = SkillModel.schema.path('template');

    // Template should be a nested schema
    expect(templateSchema).toBeDefined();

    // Check sub-paths via the nested schema
    const nestedPaths = Object.keys((templateSchema as { schema: { paths: Record<string, unknown> } }).schema.paths);
    expect(nestedPaths).toContain('persona');
    expect(nestedPaths).toContain('process');
    expect(nestedPaths).toContain('outputFormat');
    expect(nestedPaths).toContain('constraints');
    expect(nestedPaths).toContain('systemPrompt');
    expect(nestedPaths).toContain('examples');
  });

  it('should have stats sub-schema with correct fields', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const statsSchema = SkillModel.schema.path('stats');

    expect(statsSchema).toBeDefined();

    const nestedPaths = Object.keys((statsSchema as { schema: { paths: Record<string, unknown> } }).schema.paths);
    expect(nestedPaths).toContain('useCount');
    expect(nestedPaths).toContain('totalRatings');
    expect(nestedPaths).toContain('avgSatisfaction');
    expect(nestedPaths).toContain('lastUsedAt');
  });

  it('should have timestamps enabled', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const options = SkillModel.schema.options;
    expect(options.timestamps).toBe(true);
  });

  it('should have required fields enforced', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const schema = SkillModel.schema;

    expect(schema.path('tenantId').isRequired).toBe(true);
    expect(schema.path('name').isRequired).toBe(true);
    expect(schema.path('slug').isRequired).toBe(true);
    expect(schema.path('description').isRequired).toBe(true);
    expect(schema.path('pattern').isRequired).toBe(true);
    expect(schema.path('createdBy').isRequired).toBe(true);
  });

  it('should have correct indexes defined', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const indexes = SkillModel.schema.indexes();

    // Check for unique tenant+slug index
    const tenantSlugIndex = indexes.find(
      ([fields]) => fields.tenantId === 1 && fields.slug === 1,
    );
    expect(tenantSlugIndex).toBeDefined();
    expect(tenantSlugIndex?.[1]?.unique).toBe(true);

    // Check for text index on searchVector
    const textIndex = indexes.find(
      ([fields]) => fields.searchVector === 'text',
    );
    expect(textIndex).toBeDefined();

    // Check for domain index
    const domainIndex = indexes.find(
      ([fields]) => fields.tenantId === 1 && fields.domain === 1,
    );
    expect(domainIndex).toBeDefined();

    // Check for tags index
    const tagsIndex = indexes.find(
      ([fields]) => fields.tenantId === 1 && fields.tags === 1,
    );
    expect(tagsIndex).toBeDefined();

    // Check for useCount sort index
    const useCountIndex = indexes.find(
      ([fields]) => fields.tenantId === 1 && fields['stats.useCount'] === -1,
    );
    expect(useCountIndex).toBeDefined();

    // Check for public listing index
    const publicIndex = indexes.find(
      ([fields]) => fields.tenantId === 1 && fields.isPublic === 1,
    );
    expect(publicIndex).toBeDefined();
  });

  it('should default version to 1', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const versionPath = SkillModel.schema.path('version');
    expect(versionPath.options.default).toBe(1);
  });

  it('should default isSystem and isPublic to false', async () => {
    const { SkillModel } = await import('../skill.model.js');
    expect(SkillModel.schema.path('isSystem').options.default).toBe(false);
    expect(SkillModel.schema.path('isPublic').options.default).toBe(false);
  });

  it('should not select embedding by default', async () => {
    const { SkillModel } = await import('../skill.model.js');
    const embeddingPath = SkillModel.schema.path('embedding');
    expect(embeddingPath.options.select).toBe(false);
  });
});
