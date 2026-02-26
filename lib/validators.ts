import { ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  clientName: z.string().max(200).optional().nullable(),
  hourlyRate: z.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  tags: z.array(z.string().min(1).max(40)).optional()
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().max(200).optional().nullable(),
  hourlyRate: z.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  tags: z.array(z.string().min(1).max(40)).optional()
});

export const taskCreateSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  estimateMinutes: z.number().int().positive().optional().nullable()
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  estimateMinutes: z.number().int().positive().optional().nullable()
});

export const timerStartSchema = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid().optional().nullable(),
  note: z.string().max(2000).optional().nullable()
});

export const dashboardRangeSchema = z.object({
  range: z.enum(["today", "week", "month"]).default("today")
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  locale: z.literal("fr-FR").optional(),
  currency: z.literal("EUR").optional()
});

export const manualTimeEntryUpdateSchema = z.object({
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().nullable().optional(),
  note: z.string().max(2000).nullable().optional()
});
