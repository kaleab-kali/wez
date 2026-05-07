import { Injectable } from "@nestjs/common";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import { PrismaService } from "#shared/database/prisma.service";
import type { ListAuditEventsDto } from "./application/dto/list-audit-events.dto";
import type { AuditAction, AuditTargetType } from "./audit-actions";

const PAYMENT_REFERENCE_TAIL_LENGTH = 4;
const SYSTEM_ACTOR_ROLE = "system";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const EXPORT_LIMIT = 5_000;

type AuditMetadataValue = string | number | boolean | null | undefined;
type AuditMetadata = Record<string, AuditMetadataValue>;
type AuditEventWriter = Pick<PrismaService, "auditEvent">;
type AuditEventRow = Awaited<ReturnType<PrismaService["auditEvent"]["findMany"]>>[number];
type PlacementSummary = {
	workerName: string;
	employerName: string;
	roleName: string;
	stationName: string;
	status: string;
	salaryCents: string;
	commissionCents: string;
	paymentMethod: string;
	paymentReferenceLast4: string;
	endedReason: string | null;
};
type EnrichedAuditEvent = AuditEventRow & { targetSummary: PlacementSummary | null };

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

	async recordEvent(input: RecordAuditEventInput): Promise<void> {
		await this.record(this.prisma, input);
	}

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
		const page = filter.page ?? DEFAULT_PAGE;
		const limit = filter.limit ?? DEFAULT_LIMIT;
		const where = this.buildWhere(filter);
		const [items, total] = await this.prisma.$transaction([
			this.prisma.auditEvent.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.auditEvent.count({ where }),
		]);
		const data = await this.enrichEvents(items);

		return {
			data,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || DEFAULT_PAGE },
		};
	}

	async exportCsv(filter: ListAuditEventsDto): Promise<string> {
		const items = await this.prisma.auditEvent.findMany({
			where: this.buildWhere(filter),
			orderBy: { createdAt: "desc" },
			take: EXPORT_LIMIT,
		});
		const data = await this.enrichEvents(items);
		const rows = [
			[
				"created_at",
				"action",
				"actor_role",
				"worker",
				"employer",
				"role",
				"station",
				"salary_birr",
				"commission_birr",
				"payment_method",
				"payment_reference_last4",
				"end_reason",
				"target_type",
				"target_id",
				"event_id",
			],
			...data.map((event) => [
				event.createdAt.toISOString(),
				event.action,
				event.actorRole,
				event.targetSummary?.workerName ?? "",
				event.targetSummary?.employerName ?? "",
				event.targetSummary?.roleName ?? "",
				event.targetSummary?.stationName ?? "",
				this.centsToBirr(event.targetSummary?.salaryCents),
				this.centsToBirr(event.targetSummary?.commissionCents),
				event.targetSummary?.paymentMethod ?? "",
				event.targetSummary?.paymentReferenceLast4 ?? "",
				event.action === "placement.ended" ? (event.targetSummary?.endedReason ?? "") : "",
				event.targetType ?? "",
				event.targetId ?? "",
				event.id,
			]),
		];

		return rows.map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(",")).join("\n");
	}

	paymentReferenceLast4(value: string): string {
		return value.slice(-PAYMENT_REFERENCE_TAIL_LENGTH);
	}

	private buildWhere(filter: ListAuditEventsDto) {
		const createdAt =
			filter.from || filter.to
				? {
						gte: filter.from ? new Date(filter.from) : undefined,
						lte: filter.to ? new Date(filter.to) : undefined,
					}
				: undefined;
		return {
			action: filter.action,
			actorId: filter.actorId,
			actorRole: filter.actorRole,
			targetType: filter.targetType,
			targetId: filter.targetId,
			stationId: filter.stationId,
			createdAt,
		};
	}

	private async enrichEvents(items: AuditEventRow[]): Promise<EnrichedAuditEvent[]> {
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

		return items.map((event) => ({
			...event,
			targetSummary: event.targetId ? (placementSummaries.get(event.targetId) ?? null) : null,
		}));
	}

	private normalizeMetadata(metadata: AuditMetadata): AuditMetadata {
		return Object.fromEntries(
			Object.entries(metadata).filter((entry): entry is [string, Exclude<AuditMetadataValue, undefined>] => {
				const [, value] = entry;
				return value !== undefined;
			}),
		);
	}

	private centsToBirr(value: string | undefined): string {
		if (!value) return "";
		return (Number(value) / 100).toString();
	}

	private escapeCsvCell(value: string): string {
		return `"${value.replaceAll('"', '""')}"`;
	}
}
