import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateJobDto {
	@ApiProperty()
	@IsString()
	@Length(1, 100)
	roleId!: string;

	@ApiProperty()
	@IsString()
	@Length(2, 200)
	title!: string;

	@ApiProperty()
	@IsString()
	@Length(2, 5000)
	description!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 500)
	schedule?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 2000)
	requirements?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 2000)
	perks?: string;

	@ApiProperty({ description: "Min salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMinCents!: number;

	@ApiProperty({ description: "Max salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMaxCents!: number;

	@ApiProperty()
	@IsString()
	@Length(2, 50)
	location!: string;

	// Optional: agent posting on behalf of an employer must supply employerId.
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

	@ApiProperty({ required: false, default: true })
	@IsOptional()
	@IsBoolean()
	autoCloseOnPlacement?: boolean;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {
	@ApiProperty({ enum: ["open", "closed", "filled"], required: false })
	@IsOptional()
	@IsEnum(["open", "closed", "filled"] as const)
	status?: "open" | "closed" | "filled";
}

export class ListJobsDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	q?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	roleId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	roleCategory?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	location?: string;

	@ApiProperty({ required: false, enum: ["open", "closed", "filled"] })
	@IsOptional()
	@IsEnum(["open", "closed", "filled"] as const)
	status?: "open" | "closed" | "filled";

	@ApiProperty({ required: false, enum: ["business", "household"] })
	@IsOptional()
	@IsEnum(["business", "household"] as const)
	employerType?: "business" | "household";

	@ApiProperty({ required: false, description: "Minimum desired salary in cents" })
	@IsOptional()
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMinCents?: number;

	@ApiProperty({ required: false, description: "Maximum desired salary in cents" })
	@IsOptional()
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMaxCents?: number;

	@ApiProperty({ required: false, description: "Only jobs posted in the last N days" })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(365)
	@Type(() => Number)
	postedWithinDays?: number;

	@ApiProperty({ required: false, enum: ["newest", "salary_high", "salary_low"] })
	@IsOptional()
	@IsIn(["newest", "salary_high", "salary_low"] as const)
	sort?: "newest" | "salary_high" | "salary_low";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

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
