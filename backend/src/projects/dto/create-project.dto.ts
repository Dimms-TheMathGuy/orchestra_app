import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  memberIds: z.array(z.string().min(1)).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
