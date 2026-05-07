import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const PAYMENT_METHODS = ["telebirr", "cbe_birr", "bank", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class FinalizePlacementDto {
	@ApiProperty({ description: "Placement start date" })
	@IsDateString()
	startDate!: string;

	@ApiProperty({ description: "Final salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryCents!: number;

	@ApiProperty({ enum: PAYMENT_METHODS })
	@IsEnum(PAYMENT_METHODS)
	paymentMethod!: PaymentMethod;

	@ApiProperty()
	@IsString()
	@MaxLength(120)
	paymentReference!: string;

	@ApiProperty({ description: "Timestamp when placement payment was received" })
	@IsDateString()
	paymentReceivedAt!: string;

	@ApiProperty({ required: false, description: "Required when payment method is cash" })
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	cashDoubleConfirmed?: boolean;
}

export class EndPlacementDto {
	@ApiProperty({ description: "Placement end date" })
	@IsDateString()
	endDate!: string;

	@ApiProperty({ description: "Reason captured by the station agent" })
	@IsString()
	@MaxLength(500)
	endedReason!: string;

	@ApiProperty({ required: false, minimum: 1, maximum: 5 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(5)
	@Type(() => Number)
	ratingByEmployer?: number;

	@ApiProperty({ required: false, minimum: 1, maximum: 5 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(5)
	@Type(() => Number)
	ratingByWorker?: number;
}

export class ListPlacementsDto {
	@ApiProperty({ required: false, enum: ["active", "ended", "disputed", "cancelled"] })
	@IsOptional()
	@IsEnum(["active", "ended", "disputed", "cancelled"] as const)
	status?: "active" | "ended" | "disputed" | "cancelled";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	workerId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ required: false, default: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	page?: number;

	@ApiProperty({ required: false, default: 20 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Type(() => Number)
	limit?: number;
}
