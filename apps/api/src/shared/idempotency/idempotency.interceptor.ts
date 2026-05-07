import { createHash } from "node:crypto";
import {
	CallHandler,
	ConflictException,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { catchError, from, mergeMap, Observable, of, throwError } from "rxjs";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MUTATING_METHODS = ["POST", "PATCH", "DELETE"] as const;
const IN_PROGRESS_STATUS = 0;

type RequestWithIdempotency = Request & {
	readonly wezSession?: WezSession | null;
	readonly route?: { readonly path?: string | RegExp };
	readonly body?: unknown;
};

type CachedResponse = {
	readonly responseStatus: number;
	readonly responseBody: string;
	readonly endpointHash: string;
};

const isMutatingMethod = (method: string): method is (typeof MUTATING_METHODS)[number] =>
	MUTATING_METHODS.includes(method as (typeof MUTATING_METHODS)[number]);

const firstHeader = (header: string | string[] | undefined) => (Array.isArray(header) ? header[0] : header);

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const normalizeJson = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map((item) => normalizeJson(item));
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, nested]) => [key, normalizeJson(nested)]),
		);
	}
	return value;
};

const endpointIdentity = (request: RequestWithIdempotency) => {
	const routePath =
		typeof request.route?.path === "string" ? request.route.path : (request.route?.path?.toString() ?? request.path);
	const bodyHash = hash(JSON.stringify(normalizeJson(request.body ?? null)));
	return hash(`${request.method}:${request.baseUrl}${routePath}:${bodyHash}`);
};

const userIdentity = (request: RequestWithIdempotency) => {
	const sessionUserId = request.wezSession?.user.id;
	if (sessionUserId) return sessionUserId;
	const fingerprint = hash(`${request.ip ?? "unknown"}:${request.headers["user-agent"] ?? "unknown"}`);
	return `public:${fingerprint}`;
};

const parseCachedBody = (cached: CachedResponse) => JSON.parse(cached.responseBody) as unknown;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
	constructor(private readonly prisma: PrismaService) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
		const request = context.switchToHttp().getRequest<RequestWithIdempotency>();
		if (!isMutatingMethod(request.method)) return next.handle();

		const key = firstHeader(request.headers[IDEMPOTENCY_HEADER]);
		if (!key) return next.handle();

		const userId = userIdentity(request);
		const endpointHash = endpointIdentity(request);
		const now = new Date();

		await this.prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } });

		const existing = await this.prisma.idempotencyKey.findFirst({
			where: { key, userId, expiresAt: { gt: now } },
		});

		if (existing && existing.endpointHash !== endpointHash) {
			throw new ConflictException({ code: "IDEMPOTENCY_KEY_REUSED" });
		}

		if (existing?.responseStatus === IN_PROGRESS_STATUS) {
			throw new ConflictException({ code: "IDEMPOTENCY_REQUEST_IN_PROGRESS" });
		}

		if (existing) {
			const response = context.switchToHttp().getResponse<Response>();
			response.status(existing.responseStatus);
			return of(parseCachedBody(existing));
		}

		await this.prisma.idempotencyKey.create({
			data: {
				key,
				userId,
				endpointHash,
				responseStatus: IN_PROGRESS_STATUS,
				responseBody: "null",
				expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
			},
		});

		return next.handle().pipe(
			mergeMap((body) =>
				from(
					this.prisma.idempotencyKey.update({
						where: { key_userId_endpointHash: { key, userId, endpointHash } },
						data: {
							responseStatus: context.switchToHttp().getResponse<Response>().statusCode,
							responseBody: JSON.stringify(body ?? null),
						},
					}),
				).pipe(mergeMap(() => of(body))),
			),
			catchError((error: unknown) =>
				from(this.prisma.idempotencyKey.deleteMany({ where: { key, userId, endpointHash } })).pipe(
					mergeMap(() => throwError(() => error)),
				),
			),
		);
	}
}
