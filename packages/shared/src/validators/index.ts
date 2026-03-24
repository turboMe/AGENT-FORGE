import { z } from 'zod';

export const CreateTaskSchema = z.object({
  task: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        content: z.string().optional(),
      }),
    )
    .optional(),
  options: z
    .object({
      model: z.string().default('auto'),
      quality: z.enum(['fast', 'balanced', 'best']).default('balanced'),
      forceNewSkill: z.boolean().default(false),
      language: z.string().length(2).default('en'),
      context: z.record(z.string()).optional(),
      generationType: z.enum(['skill', 'agent', 'auto']).optional(),
    })
    .optional(),
  // Prompt Architect V2: follow-up conversation
  isArchitectFollowUp: z.boolean().optional(),
  architectHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
  // Direct skill reference from "Use" button
  skillId: z.string().optional(),
});

export const CreateSkillSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(200),
  description: z.string().min(1).max(2000),
  domain: z.array(z.string()).min(1).max(10),
  pattern: z.string(),
  template: z.object({
    persona: z.string().min(1),
    process: z.array(z.string()),
    outputFormat: z.string(),
    constraints: z.array(z.string()),
    systemPrompt: z.string().optional(),
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
