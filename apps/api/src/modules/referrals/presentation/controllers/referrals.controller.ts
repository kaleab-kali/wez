import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import {
	AcceptReferralDto,
	CreateReferralDto,
	DeclineReferralDto,
	DeferReferralDto,
	ListReferralsDto,
} from "../../application/dto/referral.dto";
import { ReferralsService } from "../../application/services/referrals.service";

@ApiTags("Referrals")
@ApiBearerAuth()
@Controller("referrals")
export class ReferralsController {
	constructor(private readonly service: ReferralsService) {}

	@Get()
	@ApiOperation({ summary: "List candidate referrals for staff or the current employer" })
	@ApiResponse({ status: 200, description: "Referrals returned" })
	async list(@Query() filter: ListReferralsDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "referral:read");
		return this.service.listForSession(session, filter);
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.referralCreated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.referral })
	@ApiOperation({ summary: "Create a candidate referral for employer review" })
	@ApiBody({ type: CreateReferralDto })
	@ApiResponse({ status: 201, description: "Referral created" })
	async create(@Body() dto: CreateReferralDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "referral:create");
		return { data: await this.service.create(session, dto) };
	}

	@Post(":id/accept")
	@AuditLog(AUDIT_ACTIONS.referralAccepted, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.referral,
	})
	@ApiOperation({ summary: "Accept a referral and create the hire request" })
	@ApiBody({ type: AcceptReferralDto })
	@ApiResponse({ status: 201, description: "Referral converted to hire request" })
	async accept(@Param("id") id: string, @Body() dto: AcceptReferralDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "referral:respond");
		return { data: await this.service.accept(session, id, dto) };
	}

	@Post(":id/decline")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.referralDeclined, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.referral,
	})
	@ApiOperation({ summary: "Decline a referral" })
	@ApiBody({ type: DeclineReferralDto })
	@ApiResponse({ status: 200, description: "Referral declined" })
	async decline(@Param("id") id: string, @Body() dto: DeclineReferralDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "referral:respond");
		return { data: await this.service.decline(session, id, dto.reason) };
	}

	@Post(":id/defer")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.referralDeferred, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.referral,
	})
	@ApiOperation({ summary: "Defer a referral by extending its review window" })
	@ApiBody({ type: DeferReferralDto })
	@ApiResponse({ status: 200, description: "Referral deferred" })
	async defer(@Param("id") id: string, @Body() dto: DeferReferralDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "referral:respond");
		return { data: await this.service.defer(session, id, dto) };
	}
}
