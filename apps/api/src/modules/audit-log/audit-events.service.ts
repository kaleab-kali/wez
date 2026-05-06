import { Injectable } from "@nestjs/common";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import { PrismaService } from "#shared/database/prisma.service";
import type { ListAuditEventsDto } from "./application/dto/list-audit-events.dto";
import type { AuditAction, AuditTargetType } from "./audit-actions";

const PAYMENT_REFERENCE_TAIL_LENGTH = 4;
const SYSTEM_ACTOR_ROLE = "system";

type AuditMetadataValue = string | number | boolean | null | undefined;
type AuditMetadata = Record<string, AuditMetadataValue>;
type AuditEventWriter = Pick<PrismaService, "auditEvent">;

export type RecordAuditEventInput = {
	actorId?: string | null;
	actorRole?: string | null;
	action: AuditAction;
	targetType?: AuditTargetType;
	targetId?: string;
	stationId?: string | null;
	context?: AuditRequestContext;
	metadata?: AuditMetadata;
};

@Injectable()
export class AuditEventsService {
	constructor(private readonly prisma: PrismaService) {}

	async record(writer: AuditEventWriter, input: RecordAuditEventInput): Promise<void> {
		await writer.auditEvent.create({
			data: {
				actorId: input.actorId,
				actorRole: input.actorRole ?? SYSTEM_ACTOR_ROLE,
				action: input.action,
				targetType: input.targetType,
				targetId: input.targetId,
				stationId: input.stationId,
				ipAddress: input.context?.ipAddress,
				userAgent: input.context?.userAgent,
				metadata: this.normalizeMetadata({
					...input.metadata,
					correlationId: input.context?.correlationId,
				}),
			},
		});
	}

	async list(filter: ListAuditEventsDto) {
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 25;
		const createdAt =
			filter.from || filter.to
				? {
						gte: filter.from ? new Date(filter.from) : undefined,
						lte: filter.to ? new Date(filter.to) : undefined,
					}
				: undefined;
		const where = {
			action: filter.action,
			actorId: filter.actorId,
			actorRole: filter.actorRole,
			targetType: filter.targetType,
			targetId: filter.targetId,
			stationId: filter.stationId,
			createdAt,
		};
		const [items, total] = await this.prisma.$transaction([
			this.prisma.auditEvent.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.auditEvent.count({ where }),
		]);
		const placementIds = items.flatMap((event) =>
			event.targetType === "placement" && event.targetId ? [event.targetId] : [],
		);
		const placements =
			placementIds.length > 0
				? await this.prisma.placement.findMany({
						where: { id: { in: placementIds } },
						select: {
							id: true,
							status: true,
							salaryCents: true,
							commissionCents: true,
							paymentMethod: true,
							paymentReference: true,
							endedReason: true,
							worker: { select: { fullName: true } },
							employer: { select: { name: true } },
							role: { select: { name: true } },
							station: { select: { name: true } },
						},
					})
				: [];
		const placementSummaries = new Map(
			placements.map((placement) => [
				placement.id,
				{
					workerName: placement.worker.fullName,
					employerName: placement.employer.name,
					roleName: placement.role.name,
					stationName: placement.station.name,
					status: placement.status,
					salaryCents: placement.salaryCents.toString(),
					commissionCents: placement.commissionCents.toString(),
					paymentMethod: placement.paymentMethod,
					paymentReferenceLast4: this.paymentReferenceLast4(placement.paymentReference),
					endedReason: placement.endedReason,
				},
			]),
		);

		return {
			data: items.map((event) => ({
				...event,
				targetSummary: event.targetId ? (placementSummaries.get(event.targetId) ?? null) : null,
			})),
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	paymentReferenceLast4(value: string): string {
		return value.slice(-PAYMENT_REFERENCE_TAIL_LENGTH);
	}

	private normalizeMetadata(metadata: AuditMetadata): AuditMetadata {
		return Object.fromEntries(
			Object.entries(metadata).filter((entry): entry is [string, Exclude<AuditMetadataValue, undefined>] => {
				const [, value] = entry;
				return value !== undefined;
			}),
		);
	}
}
