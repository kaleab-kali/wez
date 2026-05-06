import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { buildAuditRequestContext } from "#shared/audit/audit-context";

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
	use(req: Request, _res: Response, next: NextFunction) {
		req.auditContext = buildAuditRequestContext(req.headers);
		next();
	}
}
