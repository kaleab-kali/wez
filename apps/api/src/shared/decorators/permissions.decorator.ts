import { SetMetadata } from "@nestjs/common";
import { PERMISSIONS_KEY } from "#modules/auth/guards/permissions.guard";

export function RequirePermissions(...permissions: string[]) {
	return SetMetadata(PERMISSIONS_KEY, permissions);
}
