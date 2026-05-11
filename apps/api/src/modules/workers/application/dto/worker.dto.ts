import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	ArrayMaxSize,
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsDateString,
	IsEmail,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	Max,
	MaxLength,
	Min,
} from "class-validator";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;

export class RegisterWorkerDto {
	@ApiProperty({ example: "Hanna T." })
	@IsString()
	@Length(2, 200)
	fullName!: string;

	@ApiProperty({ example: "F-3429-1234-AA" })
	@IsString()
	@Matches(FAYDA, { message: "Fayda must look like F-XXXX-XXXX-XX" })
	fayda!: string;

	@ApiProperty({ example: "+251911223344" })
	@IsString()
	@Matches(ETHIOPIAN_PHONE, { message: "Phone must look like +2519XXXXXXXX" })
	phone!: string;

	@ApiProperty({ required: false, description: "Optional worker email login address" })
	@IsOptional()
	@IsEmail()
	@MaxLength(320)
	loginEmail?: string;

	@ApiProperty({ required: false, minLength: 8, maxLength: 128, description: "Optional worker email login password" })
	@IsOptional()
	@IsString()
	@Length(8, 128)
	loginPassword?: string;

	@ApiProperty({ example: "2000-05-12", required: false })
	@IsOptional()
	@IsDateString()
	dateOfBirth?: string;

	@ApiProperty({ enum: ["M", "F"] })
	@IsEnum(["M", "F"] as const)
	gender!: "M" | "F";

	@ApiProperty({ example: "bole" })
	@IsString()
	@Length(2, 50)
	area!: string;

	@ApiProperty({ required: false, maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	bio?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(30)
	religion?: string;

	@ApiProperty({ example: ["am", "en"], type: [String] })
	@IsArray()
	@ArrayUnique()
	@ArrayMaxSize(10)
	@IsString({ each: true })
	languages!: string[];

	@ApiProperty({ example: 3 })
	@IsInt()
	@Min(0)
	@Max(60)
	@Type(() => Number)
	experienceYears!: number;

	@ApiProperty({ example: false })
	@IsBoolean()
	hasHealthCard!: boolean;

	@ApiProperty({ example: false })
	@IsBoolean()
	hasPoliceClearance!: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	tin?: string;

	@ApiProperty({ example: ["barista", "waiter"], type: [String] })
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	roles!: string[];

	@ApiProperty({ description: "Station the worker is being registered at" })
	@IsString()
	stationId!: string;
}

export class UpdateWorkerDto extends PartialType(RegisterWorkerDto) {
	@ApiProperty({ enum: ["basic", "verified", "trained", "trusted"], required: false })
	@IsOptional()
	@IsEnum(["basic", "verified", "trained", "trusted"] as const)
	tier?: "basic" | "verified" | "trained" | "trusted";

	@ApiProperty({ enum: ["none", "notice", "warning", "suspended"], required: false })
	@IsOptional()
	@IsEnum(["none", "notice", "warning", "suspended"] as const)
	hopFlag?: "none" | "notice" | "warning" | "suspended";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	available?: boolean;
}

export class UpdateOwnWorkerProfileDto {
	@ApiProperty({ required: false, maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	bio?: string;

	@ApiProperty({ example: ["am", "en"], type: [String], required: false })
	@IsOptional()
	@IsArray()
	@ArrayUnique()
	@ArrayMaxSize(10)
	@IsString({ each: true })
	languages?: string[];
}

export class ListWorkersDto {
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
	woreda?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	adminAreaId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	subAreaId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	localityId?: string;

	@ApiProperty({ required: false, enum: ["basic", "verified", "trained", "trusted"] })
	@IsOptional()
	@IsEnum(["basic", "verified", "trained", "trusted"] as const)
	minTier?: "basic" | "verified" | "trained" | "trusted";

	@ApiProperty({ required: false, enum: ["M", "F"] })
	@IsOptional()
	@IsEnum(["M", "F"] as const)
	gender?: "M" | "F";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	language?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	religion?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsInt()
	@Min(0)
	@Type(() => Number)
	minExperience?: number;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	hasHealthCard?: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	hasPoliceClearance?: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	hideFlagged?: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	availableOnly?: boolean;

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

	@ApiProperty({ required: false, enum: ["createdAt", "rating", "tier", "experienceYears", "placementsCount"] })
	@IsOptional()
	@IsEnum(["createdAt", "rating", "tier", "experienceYears", "placementsCount"] as const)
	sortBy?: "createdAt" | "rating" | "tier" | "experienceYears" | "placementsCount";

	@ApiProperty({ required: false, enum: ["asc", "desc"] })
	@IsOptional()
	@IsEnum(["asc", "desc"] as const)
	sortOrder?: "asc" | "desc";
}
