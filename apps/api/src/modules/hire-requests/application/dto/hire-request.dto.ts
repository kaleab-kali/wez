import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from "class-validator";

export class CreateHireRequestDto {
	@ApiProperty()
	@IsString()
	workerId!: string;

	@ApiProperty()
	@IsString()
	roleId!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	jobId?: string;

	@ApiProperty({ description: "Proposed salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	proposedSalaryCents!: number;

	@ApiProperty({
		required: false,
		description: "Required for staff in-station requests. Online employer requests derive this from the worker.",
	})
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ enum: ["online", "in_person"] })
	@IsEnum(["online", "in_person"] as const)
	channel!: "online" | "in_person";

	@ApiProperty({ required: false, maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;

	// Required only when agent posts on behalf of an employer (or worker app posts).
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;
}

export class CancelHireRequestDto {
	@ApiProperty()
	@IsString()
	@Length(2, 500)
	reason!: string;
}

export class ListHireRequestsDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	workerId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ required: false, enum: ["awaiting_visit", "completed", "cancelled", "expired"] })
	@IsOptional()
	@IsEnum(["awaiting_visit", "completed", "cancelled", "expired"] as const)
	status?: "awaiting_visit" | "completed" | "cancelled" | "expired";

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
