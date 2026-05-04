import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

export class CreateStationDto {
	@ApiProperty({ example: "Bole Station" })
	@IsString()
	@Length(2, 100)
	name!: string;

	@ApiProperty({ example: "bole" })
	@IsString()
	@Length(2, 50)
	woreda!: string;

	@ApiProperty({ example: "Bole Subcity, Woreda 03, Addis Ababa" })
	@IsString()
	@Length(5, 500)
	address!: string;

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
