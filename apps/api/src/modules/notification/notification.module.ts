import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";
import { NotificationOutboxService } from "./application/services/notification-outbox.service";
import { NotificationGateway } from "./infrastructure/gateways/notification.gateway";

// Phase 1A: minimal — just the socket.io gateway for in-app push.
// Phase 1G builds dispatcher, channel adapters (SMS/email/in_app), templates, preferences, retry policy.
@Module({
	imports: [PrismaModule],
	providers: [NotificationGateway, NotificationOutboxService],
	exports: [NotificationGateway, NotificationOutboxService],
})
export class NotificationModule {}
