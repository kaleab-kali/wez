import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
	const request = ctx.switchToHttp().getRequest();
	const user = request.wezSession?.user ?? request.user;
	return data ? user?.[data] : user;
});
