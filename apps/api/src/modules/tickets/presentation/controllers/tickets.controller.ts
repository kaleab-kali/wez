import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { AssignTicketDto, CreateTicketDto, ListTicketsDto, ResolveTicketDto } from "../../application/dto/ticket.dto";
import { TicketsService } from "../../application/services/tickets.service";

@ApiTags("Tickets")
@ApiBearerAuth()
@Controller("tickets")
export class TicketsController {
	constructor(private readonly service: TicketsService) {}

	@Get()
	@ApiOperation({ summary: "List internal tickets visible to current staff user" })
	@ApiResponse({ status: 200, description: "Tickets returned" })
	async list(@Query() filter: ListTicketsDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:list");
		return this.service.listForSession(session, filter);
	}

	@Get("assignment-options")
	@ApiOperation({ summary: "List active staff users that tickets can be assigned to" })
	@ApiResponse({ status: 200, description: "Assignment options returned" })
	async assignmentOptions(@Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:assign");
		return this.service.assignmentOptions(session);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a ticket by id" })
	@ApiResponse({ status: 200, description: "Ticket returned" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:read");
		return { data: await this.service.getByIdForSession(session, id) };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.ticketCreated)
	@ApiOperation({ summary: "Create an internal escalation ticket" })
	@ApiBody({ type: CreateTicketDto })
	@ApiResponse({ status: 201, description: "Ticket created" })
	async create(@Body() dto: CreateTicketDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:create");
		return { data: await this.service.create(session, dto, req.auditContext) };
	}

	@Post(":id/assign")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.ticketAssigned)
	@ApiOperation({ summary: "Assign or reassign a ticket" })
	@ApiBody({ type: AssignTicketDto })
	@ApiResponse({ status: 200, description: "Ticket assigned" })
	async assign(@Param("id") id: string, @Body() dto: AssignTicketDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:assign");
		return { data: await this.service.assign(session, id, dto, req.auditContext) };
	}

	@Post(":id/resolve")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.ticketResolved)
	@ApiOperation({ summary: "Resolve a ticket" })
	@ApiBody({ type: ResolveTicketDto })
	@ApiResponse({ status: 200, description: "Ticket resolved" })
	async resolve(@Param("id") id: string, @Body() dto: ResolveTicketDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:resolve");
		return { data: await this.service.resolve(session, id, dto, req.auditContext) };
	}

	@Post(":id/close")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.ticketClosed)
	@ApiOperation({ summary: "Close a resolved ticket" })
	@ApiResponse({ status: 200, description: "Ticket closed" })
	async close(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "ticket:close");
		return { data: await this.service.close(session, id, req.auditContext) };
	}
}
