import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class UpdateHiringPolicyDto {
	@ApiProperty({ minimum: 1, description: "Days before awaiting hire requests expire" })
	@IsInt()
	@Min(1)
	hireRequestExpiryDays!: number;
}
