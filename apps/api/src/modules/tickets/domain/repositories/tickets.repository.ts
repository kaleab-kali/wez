import type { NewTicket, Ticket, TicketFilter, TicketPatch } from "../entities/ticket.entity";

export const TICKETS_REPO = Symbol("TICKETS_REPO");

export interface ITicketsRepository {
	findById(id: string): Promise<Ticket | null>;
	create(data: NewTicket): Promise<Ticket>;
	update(id: string, patch: TicketPatch): Promise<Ticket>;
	listByFilter(filter: TicketFilter): Promise<{ items: Ticket[]; total: number }>;
}
