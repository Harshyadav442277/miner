import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

/**
 * Serverless entrypoint. `vercel.json` rewrites every path here, so the routing
 * in handler.ts stays the single source of truth for both deployment targets.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  handleRequest(req, res);
}
