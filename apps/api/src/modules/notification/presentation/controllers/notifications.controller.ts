import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { ListNotificationsDto, UpdateNotificationPreferenceDto } from "../../application/dto/notification.dto";
import { NotificationInboxService } from "../../application/services/notification-inbox.service";
import { NotificationPreferencesService } from "../../application/services/notification-preferences.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
	constructor(
		private readonly inbox: NotificationInboxService,
		private readonly preferences: NotificationPreferencesService,
	) {}

	@Get()
	@ApiOperation({ summary: "List in-app notifications for the current user" })
	@ApiResponse({ status: 200, description: "Notifications returned" })
	async list(@Query() query: ListNotificationsDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:read");
		return this.inbox.listForSession(session, query);
	}

	@Get("unread-count")
	@ApiOperation({ summary: "Return unread in-app notification count" })
	@ApiResponse({ status: 200, description: "Unread count returned" })
	async unreadCount(@Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:read");
		return { data: { unread: await this.inbox.unreadCount(session) } };
	}

	@Get("preferences")
	@ApiOperation({ summary: "List notification preferences for the current user" })
	@ApiResponse({ status: 200, description: "Notification preferences returned" })
	async preferencesForSession(@Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:read");
		return this.preferences.listForSession(session);
	}

	@Patch("preferences")
	@AuditLog(AUDIT_ACTIONS.notificationPreferencesUpdated, {
		mode: "auto",
		targetType: AUDIT_TARGET_TYPES.notificationPreference,
	})
	@ApiOperation({ summary: "Update a notification preference" })
	@ApiBody({ type: UpdateNotificationPreferenceDto })
	@ApiResponse({ status: 200, description: "Notification preference updated" })
	async updatePreference(@Body() dto: UpdateNotificationPreferenceDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:update_preferences");
		return { data: await this.preferences.updateForSession(session, dto) };
	}

	@Post(":id/read")
	@AuditLog(AUDIT_ACTIONS.notificationRead, {
		mode: "auto",
		targetType: AUDIT_TARGET_TYPES.notification,
		targetIdParam: "id",
	})
	@ApiOperation({ summary: "Mark one notification as read" })
	@ApiResponse({ status: 200, description: "Notification marked as read" })
	async markRead(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:read");
		return { data: await this.inbox.markRead(session, id) };
	}

	@Post("read-all")
	@AuditLog(AUDIT_ACTIONS.notificationRead, { mode: "auto", targetType: AUDIT_TARGET_TYPES.notification })
	@ApiOperation({ summary: "Mark all in-app notifications as read" })
	@ApiResponse({ status: 200, description: "Notifications marked as read" })
	async markAllRead(@Req() req: WezRequest) {
		const session = await requirePermission(req, "notification:read");
		return { data: await this.inbox.markAllRead(session) };
	}
}
