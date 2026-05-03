import { randomUUID } from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { CORRELATION_ID_HEADER } from "./logger.constants";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();
		req.headers[CORRELATION_ID_HEADER] = correlationId;
		req.id = correlationId;
		res.setHeader(CORRELATION_ID_HEADER, correlationId);
		next();
	}
}
