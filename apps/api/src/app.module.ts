import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "#modules/admin/admin.module";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { AuthModule } from "#modules/auth/auth.module";
import { WezAuthGuard } from "#modules/auth/guards/wez-auth.guard";
import { ComplaintsModule } from "#modules/complaints/complaints.module";
import { EmployersModule } from "#modules/employers/employers.module";
import { ErrorReportingModule } from "#modules/error-reporting/error-reporting.module";
import { HealthModule } from "#modules/health/health.module";
import { HireRequestsModule } from "#modules/hire-requests/hire-requests.module";
import { JobsModule } from "#modules/jobs/jobs.module";
import { LocationsModule } from "#modules/locations/locations.module";
import { LookupsModule } from "#modules/lookups/lookups.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { PlacementsModule } from "#modules/placements/placements.module";
import { PlatformSettingsModule } from "#modules/platform-settings/platform-settings.module";
import { ReferralsModule } from "#modules/referrals/referrals.module";
import { RoleCatalogModule } from "#modules/role-catalog/role-catalog.module";
import { StaffUsersModule } from "#modules/staff-users/staff-users.module";
import { StationsModule } from "#modules/stations/stations.module";
import { TicketsModule } from "#modules/tickets/tickets.module";
import { WorkersModule } from "#modules/workers/workers.module";
import { AuditContextMiddleware } from "#shared/audit/audit-context.middleware";
import { PrismaModule } from "#shared/database/prisma.module";
import { EmailModule } from "#shared/email/email.module";
import { DomainEventBusModule } from "#shared/events/domain-event.bus";
import { GlobalExceptionFilter } from "#shared/filters/global-exception.filter";
import { IdempotencyInterceptor } from "#shared/idempotency/idempotency.interceptor";
import { CorrelationIdMiddleware } from "#shared/logger/correlation-id.middleware";
import { LoggerModule } from "#shared/logger/logger.module";
import { StorageModule } from "#shared/storage/storage.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
		ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
		LoggerModule,
		EmailModule,
		EventEmitterModule.forRoot(),
		DomainEventBusModule,
		ScheduleModule.forRoot(),
		PrismaModule,
		StorageModule,
		HealthModule,
		AuditLogModule,
		AuthModule,
		AdminModule,
		NotificationModule,
		PlatformSettingsModule,
		PlacementsModule,
		StationsModule,
		RoleCatalogModule,
		StaffUsersModule,
		LocationsModule,
		LookupsModule,
		WorkersModule,
		EmployersModule,
		JobsModule,
		HireRequestsModule,
		ReferralsModule,
		ComplaintsModule,
		TicketsModule,
		ErrorReportingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
		{ provide: APP_GUARD, useClass: WezAuthGuard },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware, AuditContextMiddleware).forRoutes("*");
	}
}
