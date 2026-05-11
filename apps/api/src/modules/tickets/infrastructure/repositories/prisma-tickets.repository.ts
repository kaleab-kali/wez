import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";
import type {
	NewTicket,
	Ticket,
	TicketCategory,
	TicketFilter,
	TicketPatch,
	TicketPriority,
	TicketStatus,
} from "../../domain/entities/ticket.entity";
import type { ITicketsRepository } from "../../domain/repositories/tickets.repository";

type TicketRow = {
	id: string;
	raisedById: string;
	raisedBy?: { name: string; email: string; role: string } | null;
	category: string;
	title: string;
	description: string;
	priority: string;
	status: string;
	assignedToId: string | null;
	assignedTo?: { name: string; email: string; role: string } | null;
	resolution: string | null;
	resolvedAt: Date | null;
	resolvedById: string | null;
	resolvedBy?: { name: string; email: string } | null;
	createdAt: Date;
	updatedAt: Date;
};

const TICKET_INCLUDE = {
	raisedBy: { select: { name: true, email: true, role: true } },
	assignedTo: { select: { name: true, email: true, role: true } },
	resolvedBy: { select: { name: true, email: true } },
} as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toTicket = (row: TicketRow): Ticket => ({
	id: row.id,
	raisedById: row.raisedById,
	raisedByName: row.raisedBy?.name ?? row.raisedBy?.email,
	raisedByRole: row.raisedBy?.role,
	category: row.category as TicketCategory,
	title: row.title,
	description: row.description,
	priority: row.priority as TicketPriority,
	status: row.status as TicketStatus,
	assignedToId: row.assignedToId,
	assignedToName: row.assignedTo?.name ?? row.assignedTo?.email ?? null,
	assignedToRole: row.assignedTo?.role ?? null,
	resolution: row.resolution,
	resolvedAt: row.resolvedAt,
	resolvedById: row.resolvedById,
	resolvedByName: row.resolvedBy?.name ?? row.resolvedBy?.email ?? null,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaTicketsRepository implements ITicketsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
		return row ? toTicket(row as unknown as TicketRow) : null;
	}

	async create(data: NewTicket) {
		const row = await this.prisma.ticket.create({
			data: {
				raisedById: data.raisedById,
				category: data.category,
				title: data.title,
				description: data.description,
				priority: data.priority,
				status: data.status,
				assignedToId: data.assignedToId,
				resolution: data.resolution,
				resolvedAt: data.resolvedAt,
				resolvedById: data.resolvedById,
			},
			include: TICKET_INCLUDE,
		});
		return toTicket(row as unknown as TicketRow);
	}

	async update(id: string, patch: TicketPatch) {
		const row = await this.prisma.ticket.update({ where: { id }, data: patch, include: TICKET_INCLUDE });
		return toTicket(row as unknown as TicketRow);
	}

	async listByFilter(filter: TicketFilter) {
		const page = Math.max(DEFAULT_PAGE, filter.page ?? DEFAULT_PAGE);
		const limit = Math.min(Math.max(1, filter.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
		const where = this.buildWhere(filter);
		const [rows, total] = await Promise.all([
			this.prisma.ticket.findMany({
				where,
				include: TICKET_INCLUDE,
				orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.ticket.count({ where }),
		]);
		return { items: rows.map((row) => toTicket(row as unknown as TicketRow)), total };
	}

	private buildWhere(filter: TicketFilter): Prisma.TicketWhereInput {
		const andFilters: Prisma.TicketWhereInput[] = [];
		if (filter.visibleRaisedByIds || filter.visibleAssignedToIds) {
			andFilters.push({
				OR: [
					{ raisedById: { in: [...(filter.visibleRaisedByIds ?? [])] } },
					{ assignedToId: { in: [...(filter.visibleAssignedToIds ?? [])] } },
				],
			});
		}

		return {
			status: filter.status,
			priority: filter.priority,
			category: filter.category,
			assignedToId: filter.assignedToId,
			raisedById: filter.raisedById,
			AND: andFilters.length > 0 ? andFilters : undefined,
		};
	}
}
