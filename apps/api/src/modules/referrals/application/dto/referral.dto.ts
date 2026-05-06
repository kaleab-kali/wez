import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateReferralDto {
	@ApiProperty()
	@IsString()
	workerId!: string;

	@ApiProperty()
	@IsString()
	employerId!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	jobId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 1000)
	note?: string;
}

export class AcceptReferralDto {
	@ApiProperty()
	@IsString()
	stationId!: string;

	@ApiProperty({ required: false, description: "Required when referral is not tied to a job" })
	@IsOptional()
	@IsString()
	roleId?: string;

	@ApiProperty({ description: "Proposed salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	proposedSalaryCents!: number;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 1000)
	note?: string;
}

export class DeclineReferralDto {
	@ApiProperty()
	@IsString()
	@Length(2, 1000)
	reason!: string;
}

export class DeferReferralDto {
	@ApiProperty({ default: 7 })
	@IsInt()
	@Min(1)
	@Type(() => Number)
	days!: number;
}

export class ListReferralsDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	workerId?: string;

	@ApiProperty({ required: false, enum: ["pending_employer", "converted", "declined", "expired"] })
	@IsOptional()
	@IsEnum(["pending_employer", "converted", "declined", "expired"] as const)
	status?: "pending_employer" | "converted" | "declined" | "expired";

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
	@Type(() => Number)
	limit?: number;
}
