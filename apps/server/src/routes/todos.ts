import { Router, Request, Response } from 'express';
import { prisma } from '@makeforest/db';
import { CreateTodoBody, UpdateTodoBody, TodoQuery } from '@makeforest/types';

export const todosRouter = Router();

// GET /todos?userId=...&date=...
todosRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, date } = TodoQuery.parse(req.query);
    const todos = await prisma.todo.findMany({
      where: { userId, date },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, done: true },
    });
    return res.json(todos);
  } catch (err) {
    console.error('[todos] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /todos
todosRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, date, text } = CreateTodoBody.parse(req.body);
    const todo = await prisma.todo.create({
      data: { userId, date, text },
      select: { id: true, text: true, done: true },
    });
    return res.status(201).json(todo);
  } catch (err) {
    console.error('[todos] POST / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /todos/:id
todosRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    const body = UpdateTodoBody.parse(req.body);

    const todo = await prisma.todo.findUnique({ where: { id }, select: { userId: true } });
    if (!todo) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        ...(body.text !== undefined ? { text: body.text } : {}),
        ...(body.done !== undefined ? { done: body.done } : {}),
      },
      select: { id: true, text: true, done: true },
    });
    return res.json(updated);
  } catch (err) {
    console.error('[todos] PATCH /:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /todos/:id
todosRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    const todo = await prisma.todo.findUnique({ where: { id }, select: { id: true } });
    if (!todo) return res.status(404).json({ error: 'Not found' });
    await prisma.todo.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('[todos] DELETE /:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
