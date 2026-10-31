import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { taskService } from '../services/index.js';

export async function createTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const task = await taskService.createTask(req.userId!, req.body);
  res.status(201).json({ success: true, data: task });
}

export async function getTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const task = await taskService.getTaskById(req.userId!, req.params.id as string);
  res.json({ success: true, data: task });
}

export async function listTasks(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const result = await taskService.listTasks(req.userId!, req.query as never);
  const totalPages = Math.ceil(result.total / result.limit) || 1;
  res.json({
    success: true,
    data: result.tasks,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages,
      hasNext: result.page < totalPages,
      hasPrev: result.page > 1,
    },
  });
}

export async function updateTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const task = await taskService.updateTask(req.userId!, req.params.id as string, req.body);
  res.json({ success: true, data: task });
}

export async function completeTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const task = await taskService.completeTask(req.userId!, req.params.id as string);
  res.json({ success: true, data: task });
}

export async function deleteTask(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  await taskService.deleteTask(req.userId!, req.params.id as string);
  res.status(204).send();
}
