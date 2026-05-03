import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PinoLogger } from "nestjs-pino";
import { SLOW_QUERY_THRESHOLD_MS } from "#shared/logger/logger.constants";
import { PrismaClient } from "../../generated/prisma/client";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly logger: PinoLogger) {
		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL as string,
		});
		super({ adapter });
		this.logger.setContext(PrismaService.name);
	}

	async onModuleInit() {
		await this.$connect();
		this.logger.info("Database connected");
	}

	async onModuleDestroy() {
		await this.$disconnect();
		this.logger.info("Database disconnected");
	}

	/**
	 * Creates an extended client that logs query duration.
	 * Dev: logs all queries. Prod: logs only slow queries (>SLOW_QUERY_THRESHOLD_MS).
	 */
	withQueryLogging() {
		return this.$extends({
			query: {
				$allModels: {
					async $allOperations({ model, operation, args, query }) {
						const start = performance.now();
						const result = await query(args);
						const duration = Math.round(performance.now() - start);

						if (!IS_PRODUCTION || duration > SLOW_QUERY_THRESHOLD_MS) {
							this.logger.debug(
								{
									prismaQuery: true,
									model,
									operation,
									duration,
									...(duration > SLOW_QUERY_THRESHOLD_MS ? { slow: true } : {}),
								},
								`${model}.${operation} (${duration}ms)`,
							);
						}

						return result;
					},
				},
			},
		});
	}
}
