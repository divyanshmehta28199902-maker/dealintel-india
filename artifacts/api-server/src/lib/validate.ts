import { type Response, type NextFunction } from "express";
import { z } from "zod/v4";
import { type AuthRequest } from "./auth";

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Validation failed", details: result.error.issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function parseId(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
