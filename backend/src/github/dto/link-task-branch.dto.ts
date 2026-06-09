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
  // Optional value to push to the same property when work *starts* (first commit
  // on the branch). Omitted/empty = don't touch Notion until completion.
  inProgressValue: z.union([z.boolean(), z.string()]).optional(),
  // Opt in to gating completion on an approving GitHub review. Default off:
  // any merge into the target branch completes the task (solo/self-merge flow).
  requireApproval: z.boolean().default(false),
});

export type LinkTaskBranchDto = z.infer<typeof linkTaskBranchSchema>;
