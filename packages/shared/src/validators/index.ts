import { z } from 'zod';

export const CreateTaskSchema = z.object({
  task: z.string().min(1).max(10000),
  options: z
    .object({
      model: z.enum(['auto', 'claude', 'gpt', 'gemini']).default('auto'),
      quality: z.enum(['fast', 'balanced', 'best']).default('balanced'),
      forceNewSkill: z.boolean().default(false),
      language: z.string().length(2).default('en'),
      context: z.record(z.string()).optional(),
    })
    .optional(),
});

export const CreateSkillSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(1000),
  domain: z.array(z.string()).min(1).max(10),
  pattern: z.string(),
  template: z.object({
    persona: z.string().min(10),
    process: z.array(z.string()).min(1),
    outputFormat: z.string(),
    constraints: z.array(z.string()),
    examples: z
      .array(
        z.object({
          input: z.string(),
          output: z.string(),
        }),
      )
      .optional(),
  }),
});

export const RateSkillSchema = z.object({
  taskId: z.string(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type CreateSkillInput = z.infer<typeof CreateSkillSchema>;
export type RateSkillInput = z.infer<typeof RateSkillSchema>;
