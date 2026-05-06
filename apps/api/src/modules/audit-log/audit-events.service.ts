import { Injectable } from "@nestjs/common";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { PrismaService } from "#shared/database/prisma.service";
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
