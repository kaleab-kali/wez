import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "#modules/admin/admin.module";
import { AuthModule } from "#modules/auth/auth.module";
import { ErrorReportingModule } from "#modules/error-reporting/error-reporting.module";
import { HealthModule } from "#modules/health/health.module";
import { LookupsModule } from "#modules/lookups/lookups.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { RoleCatalogModule } from "#modules/role-catalog/role-catalog.module";
import { StationsModule } from "#modules/stations/stations.module";
import { WorkersModule } from "#modules/workers/workers.module";
import { PrismaModule } from "#shared/database/prisma.module";
import { EmailModule } from "#shared/email/email.module";
import { DomainEventBusModule } from "#shared/events/domain-event.bus";
import { GlobalExceptionFilter } from "#shared/filters/global-exception.filter";
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
		AuthModule,
		AdminModule,
		NotificationModule,
		StationsModule,
		RoleCatalogModule,
		LookupsModule,
		WorkersModule,
		ErrorReportingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware).forRoutes("*");
	}
}
