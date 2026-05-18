import { z } from 'zod';

export const linkTaskBranchSchema = z.object({
  repoId: z.string().min(1),
  taskId: z.string().min(1),
  branchName: z.string().min(1),
  targetBranch: z.string().min(1).default('main'),
  databaseId: z.string().min(1),
  completionPropertyName: z.string().min(1),
  completionPropertyType: z.enum(['checkbox', 'status', 'select']),
  completionValue: z.union([z.boolean(), z.string()]),
});

export type LinkTaskBranchDto = z.infer<typeof linkTaskBranchSchema>;
