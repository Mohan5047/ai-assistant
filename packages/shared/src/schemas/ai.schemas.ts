import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  threadId: z.string().uuid().optional(),
  confirmationResponse: z
    .object({
      actionId: z.string(),
      confirmed: z.boolean(),
    })
    .optional(),
});

export type AiChatInput = z.infer<typeof aiChatSchema>;
