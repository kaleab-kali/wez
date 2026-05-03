import { Module } from "@nestjs/common";
import { NotificationGateway } from "./infrastructure/gateways/notification.gateway";

// Phase 1A: minimal — just the socket.io gateway for in-app push.
// Phase 1G builds dispatcher, channel adapters (SMS/email/in_app), templates, preferences, retry policy.
@Module({
	providers: [NotificationGateway],
	exports: [NotificationGateway],
})
export class NotificationModule {}
