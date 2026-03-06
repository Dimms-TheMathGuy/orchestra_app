import {z} from 'zod';

export const createPageSchema = z.object({
    databaseId: z.string().min(1),
    properties: z.record(z.string(), z.any())
});