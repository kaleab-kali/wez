import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";
import { EmailModule } from "#shared/email/email.module";
import { NotificationDispatcherService } from "./application/services/notification-dispatcher.service";
import { NotificationInboxService } from "./application/services/notification-inbox.service";
import { NotificationOutboxService } from "./application/services/notification-outbox.service";
import { NotificationPreferencesService } from "./application/services/notification-preferences.service";
import { NotificationTemplateService } from "./application/services/notification-template.service";
import { NotificationGateway } from "./infrastructure/gateways/notification.gateway";
import { NotificationsController } from "./presentation/controllers/notifications.controller";

@Module({
	imports: [PrismaModule, EmailModule],
	controllers: [NotificationsController],
	providers: [
		NotificationGateway,
		NotificationInboxService,
		NotificationOutboxService,
		NotificationTemplateService,
		NotificationPreferencesService,
		NotificationDispatcherService,
	],
	exports: [
		NotificationGateway,
		NotificationInboxService,
		NotificationOutboxService,
		NotificationTemplateService,
		NotificationPreferencesService,
		NotificationDispatcherService,
	],
})
export class NotificationModule {}
