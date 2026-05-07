import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;
const ERCA_TIN = /^(TIN-\d{6}|\d{10})$/;

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
	@Matches(ERCA_TIN, { message: "TIN must be 10 digits or TIN-XXXXXX" })
	tin?: string;

	@ApiProperty({ required: false, description: "Business license number" })
	@IsOptional()
	@IsString()
	@Length(0, 50)
	businessLicense?: string;

	@ApiProperty({ required: false, description: "Business license expiry date, YYYY-MM-DD" })
	@IsOptional()
	@IsDateString()
	businessLicenseExpiresAt?: string;

	@ApiProperty({ required: false, description: "Business address" })
	@IsOptional()
	@IsString()
	@Length(0, 300)
	businessAddress?: string;

	@ApiProperty({ required: false, description: "Business category, e.g. hotel or restaurant" })
	@IsOptional()
	@IsString()
	@Length(0, 80)
	businessCategory?: string;

	// Household-only
	@ApiProperty({ required: false, description: "Household head Fayda" })
	@IsOptional()
	@IsString()
	@Matches(FAYDA, { message: "Fayda must look like F-XXXX-XXXX-XX" })
	fayda?: string;

	@ApiProperty({ required: false, description: "Secondary household contact" })
	@IsOptional()
	@IsString()
	@Length(0, 200)
	secondaryContact?: string;
}

export class SignupEmployerDto extends CreateEmployerDto {
	@ApiProperty({ example: "owner@business.local", description: "Customer login email" })
	@IsEmail()
	loginEmail!: string;

	@ApiProperty({ minLength: 8, maxLength: 128, description: "Customer login password" })
	@IsString()
	@Length(8, 128)
	loginPassword!: string;
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
