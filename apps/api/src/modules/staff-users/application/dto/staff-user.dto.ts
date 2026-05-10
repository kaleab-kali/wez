import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from "class-validator";
import { WEZ_STAFF_ROLES } from "#modules/auth/permissions";

export const STAFF_SCOPE_TYPES = ["global", "admin_area", "sub_area", "locality", "station"] as const;
const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

export class CreateStaffUserDto {
	@ApiProperty({ example: "Sara Finance" })
	@IsString()
	@Length(2, 100)
	name!: string;

	@ApiProperty({ example: "sara@wez.local" })
	@IsEmail()
	email!: string;

	@ApiProperty({ required: false, example: "+251911223344" })
	@IsOptional()
	@IsString()
	@Matches(ETHIOPIAN_PHONE)
	phone?: string;

	@ApiProperty({ enum: WEZ_STAFF_ROLES })
	@IsEnum(WEZ_STAFF_ROLES)
	primaryRole!: (typeof WEZ_STAFF_ROLES)[number];

	@ApiProperty({ required: false, minLength: 12, maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(12, 128)
	temporaryPassword?: string;
}

export class UpdateStaffUserDto extends PartialType(CreateStaffUserDto) {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}

export class AssignStaffRoleDto {
	@ApiProperty({ enum: WEZ_STAFF_ROLES })
	@IsEnum(WEZ_STAFF_ROLES)
	role!: (typeof WEZ_STAFF_ROLES)[number];

	@ApiProperty({ enum: STAFF_SCOPE_TYPES })
	@IsEnum(STAFF_SCOPE_TYPES)
	scopeType!: (typeof STAFF_SCOPE_TYPES)[number];

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	scopeId?: string;
}

export class RevokeStaffRoleDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(5, 500)
	reason?: string;
}
