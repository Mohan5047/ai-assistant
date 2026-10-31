import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import * as aiService from '../services/ai/ai.service.js';
import { generateDailyPlan } from '../services/ai/daily-planner.js';

export async function chat(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await aiService.handleChatMessage(req.userId!, req.body);
  res.json({ success: true, data: result });
}

export async function listConversations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const threads = await aiService.listConversations(req.userId!);
  res.json({ success: true, data: threads });
}

export async function getConversation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const thread = await aiService.getConversationById(req.userId!, req.params.id as string);
  res.json({ success: true, data: thread });
}

export async function deleteConversation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  await aiService.deleteConversation(req.userId!, req.params.id as string);
  res.status(204).send();
}

export async function getDailyPlan(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const dateStr = req.query.date as string | undefined;
  const plan = await generateDailyPlan(req.userId!, dateStr);
  res.json({ success: true, data: plan });
}
