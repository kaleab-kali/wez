import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

export class CreateStationDto {
	@ApiProperty({ example: "Bole Station" })
	@IsOptional()
	@IsString()
	@Length(2, 100)
	name?: string;

	@ApiProperty({ example: "bole" })
	@IsOptional()
	@IsString()
	@Length(2, 50)
	woreda?: string;

	@ApiProperty({ example: "Bole Subcity, Woreda 03, Addis Ababa" })
	@IsOptional()
	@IsString()
	@Length(5, 500)
	address?: string;

	@ApiProperty({ required: false, description: "Required for normal stations created from the location hierarchy" })
	@IsOptional()
	@IsUUID()
	localityId?: string;

	@ApiProperty({ required: false, default: false })
	@IsOptional()
	@IsBoolean()
	custom?: boolean;

	@ApiProperty({ required: false, description: "Required when creating a rare custom station" })
	@IsOptional()
	@IsString()
	@Length(10, 500)
	customReason?: string;

	@ApiProperty({ example: "+251115000001", required: false })
	@IsOptional()
	@IsString()
	@Matches(ETHIOPIAN_PHONE, { message: "Phone must look like +2519XXXXXXXX" })
	phone?: string;

	@ApiProperty({ example: "user_xyz", required: false })
	@IsOptional()
	@IsString()
	supervisorUserId?: string;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}

export class AssignAgentDto {
	@ApiProperty({ example: "user_abc" })
	@IsString()
	userId!: string;
}
