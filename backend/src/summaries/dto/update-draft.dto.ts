import { z } from 'zod';

export const draftEntrySchema = z.object({
    properties: z.record(z.string(), z.unknown()),
});

export const updateDraftSchema = z.object({
    entries: z.array(draftEntrySchema),
});
