import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PinoLogger } from "nestjs-pino";
import { mergeMap, type Observable } from "rxjs";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { AUDIT_LOG_METADATA_KEY, type AuditLogMetadata, SKIP_AUDIT_LOG_METADATA_KEY } from "./audit-log.decorator";

const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const MAX_METADATA_LENGTH = 2_000;
const UNAVAILABLE_TARGET_ID = undefined;
const ANONYMOUS_ACTOR_ROLE = "anonymous";
const REDACTED_VALUE = "[REDACTED]";
const AUDIT_REDACTED_FIELD_FRAGMENTS = [
	"address",
	"authorization",
	"bio",
	"contact",
	"creditcard",
	"email",
	"fayda",
	"license",
	"name",
	"note",
	"password",
	"phone",
	"reason",
	"secret",
	"ssn",
	"tin",
	"token",
] as const;

type RequestWithAudit = Request & {
	auditContext?: AuditRequestContext;
	wezSession?: WezSession | null;
};

type ResponseWithData = {
	data?: {
		id?: unknown;
	};
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
	constructor(
		private readonly reflector: Reflector,
		private readonly auditEvents: AuditEventsService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(AuditLogInterceptor.name);
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<RequestWithAudit>();
		const auditLog = this.reflector.getAllAndOverride<AuditLogMetadata>(AUDIT_LOG_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!auditLog && !skipAudit && this.isMutation(request.method)) {
			this.logger.warn(
				{ method: request.method, path: request.route?.path ?? request.path },
				"Mutation handler is missing @AuditLog or @SkipAuditLog",
			);
		}

		if (!auditLog || auditLog.mode !== "auto") return next.handle();

		return next.handle().pipe(
			mergeMap(async (response: unknown) => {
				await this.recordAutomaticEvent(request, auditLog, response);
				return response;
			}),
		);
	}

	private async recordAutomaticEvent(
		request: RequestWithAudit,
		auditLog: AuditLogMetadata,
		response: unknown,
	): Promise<void> {
		const session = request.wezSession;
		await this.auditEvents.recordEvent({
			actorId: session?.user.id,
			actorRole: session?.user.role ?? ANONYMOUS_ACTOR_ROLE,
			action: auditLog.action,
			targetType: auditLog.targetType,
			targetId: this.resolveTargetId(request, response, auditLog.targetIdParam),
			context: request.auditContext,
			metadata: {
				changedFields: this.changedFields(request.body),
				requestBody: this.safeMetadataString(request.body),
				routeParams: this.safeMetadataString(request.params),
			},
		});
	}

	private isMutation(method: string): boolean {
		return (MUTATION_METHODS as readonly string[]).includes(method.toUpperCase());
	}

	private resolveTargetId(request: Request, response: unknown, targetIdParam: string | undefined): string | undefined {
		const paramValue = targetIdParam ? request.params[targetIdParam] : undefined;
		if (typeof paramValue === "string") return paramValue;
		if (Array.isArray(paramValue)) return paramValue[0];
		const responseId = (response as ResponseWithData | null)?.data?.id;
		return typeof responseId === "string" ? responseId : UNAVAILABLE_TARGET_ID;
	}

	private changedFields(body: unknown): string | undefined {
		if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
		return Object.keys(body as Record<string, unknown>)
			.sort()
			.join(",");
	}

	private safeMetadataString(value: unknown): string | undefined {
		if (value === undefined || value === null) return undefined;
		const redacted = this.redactAuditMetadata(value);
		return JSON.stringify(redacted).slice(0, MAX_METADATA_LENGTH);
	}

	private redactAuditMetadata(value: unknown): unknown {
		if (value === null || value === undefined) return value;
		if (typeof value !== "object") return value;
		if (Array.isArray(value)) return value.map((item) => this.redactAuditMetadata(item));

		const redacted: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			redacted[key] = this.isAuditPiiField(key) ? REDACTED_VALUE : this.redactAuditMetadata(nestedValue);
		}
		return redacted;
	}

	private isAuditPiiField(key: string): boolean {
		const normalizedKey = key.toLowerCase();
		return AUDIT_REDACTED_FIELD_FRAGMENTS.some((field) => normalizedKey.includes(field));
	}
}
