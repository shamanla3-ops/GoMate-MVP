import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jsonApiError } from "../lib/apiErrors.js";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    jsonApiError(res, 401, "AUTH_MISSING_HEADER");
    return;
  }
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    jsonApiError(res, 503, "SERVER_MISCONFIGURED");
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    jsonApiError(res, 401, "AUTH_TOKEN_INVALID");
  }
}
