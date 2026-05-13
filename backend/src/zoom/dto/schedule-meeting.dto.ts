import { z } from 'zod';

export const scheduleMeetingSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
    start_time: z.string().min(1, 'Start time is required (ISO 8601)'),
    duration_minutes: z.number().int().min(1).max(1440),
    agenda: z.string().optional(),
    blockId: z.string().optional(),
});

export type ScheduleMeetingDto = z.infer<typeof scheduleMeetingSchema>;
