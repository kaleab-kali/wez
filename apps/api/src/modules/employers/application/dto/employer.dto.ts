import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;

export class CreateEmployerDto {
	@ApiProperty({ enum: ["business", "household"] })
	@IsEnum(["business", "household"] as const)
	type!: "business" | "household";

	@ApiProperty({ example: "Acme Cafe" })
	@IsString()
	@Length(2, 200)
	name!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(0, 200)
	contactName?: string;

	@ApiProperty({ example: "+251911223344" })
	@IsString()
	@Matches(ETHIOPIAN_PHONE, { message: "Phone must look like +2519XXXXXXXX" })
	phone!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsEmail()
	email?: string;

	@ApiProperty({ example: "bole" })
	@IsString()
	@Length(2, 50)
	area!: string;

	// Business-only
	@ApiProperty({ required: false, description: "Business TIN" })
	@IsOptional()
	@IsString()
	@Length(0, 20)
	tin?: string;

	@ApiProperty({ required: false, description: "Business license number" })
	@IsOptional()
	@IsString()
	@Length(0, 50)
	businessLicense?: string;

	// Household-only
	@ApiProperty({ required: false, description: "Household head Fayda" })
	@IsOptional()
	@IsString()
	@Matches(FAYDA, { message: "Fayda must look like F-XXXX-XXXX-XX" })
	fayda?: string;
}

export class UpdateEmployerDto extends PartialType(CreateEmployerDto) {
	@ApiProperty({ enum: ["green", "yellow", "orange", "red"], required: false })
	@IsOptional()
	@IsEnum(["green", "yellow", "orange", "red"] as const)
	rating?: "green" | "yellow" | "orange" | "red";
}

export class ListEmployersDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	q?: string;

	@ApiProperty({ required: false, enum: ["business", "household"] })
	@IsOptional()
	@IsEnum(["business", "household"] as const)
	type?: "business" | "household";

	@ApiProperty({ required: false, enum: ["green", "yellow", "orange", "red"] })
	@IsOptional()
	@IsEnum(["green", "yellow", "orange", "red"] as const)
	rating?: "green" | "yellow" | "orange" | "red";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	area?: string;

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
