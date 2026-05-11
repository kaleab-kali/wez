import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { SignPutFileDto } from "../../application/dto/file.dto";
import { FilesService } from "../../application/services/files.service";

@ApiTags("Files")
@ApiBearerAuth()
@Controller("files")
export class FilesController {
	constructor(private readonly service: FilesService) {}

	@Post("sign-put")
	@AuditLog(AUDIT_ACTIONS.fileUploadSigned, { mode: "auto", targetType: AUDIT_TARGET_TYPES.attachment })
	@ApiOperation({ summary: "Create a short-lived upload slot" })
	@ApiBody({ type: SignPutFileDto })
	@ApiResponse({ status: 201, description: "Upload slot returned" })
	async signPut(@Body() dto: SignPutFileDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "file:create");
		return this.service.signPut(session, dto);
	}

	@Post(":id/upload")
	@UseInterceptors(FileInterceptor("file"))
	@AuditLog(AUDIT_ACTIONS.fileUploaded, {
		mode: "auto",
		targetType: AUDIT_TARGET_TYPES.attachment,
		targetIdParam: "id",
	})
	@ApiConsumes("multipart/form-data")
	@ApiOperation({ summary: "Upload file bytes for an upload slot" })
	@ApiBody({
		schema: {
			type: "object",
			properties: { file: { type: "string", format: "binary" } },
			required: ["file"],
		},
	})
	@ApiResponse({ status: 200, description: "File uploaded and queued for scan" })
	async upload(@Param("id") id: string, @UploadedFile() file: Express.Multer.File, @Req() req: WezRequest) {
		const session = await requirePermission(req, "file:create");
		return this.service.upload(session, id, file);
	}

	@Post(":id/finalize")
	@AuditLog(AUDIT_ACTIONS.fileFinalized, {
		mode: "auto",
		targetType: AUDIT_TARGET_TYPES.attachment,
		targetIdParam: "id",
	})
	@ApiOperation({ summary: "Finalize an uploaded file after virus scan" })
	@ApiResponse({ status: 200, description: "Attachment finalized" })
	async finalize(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "file:create");
		return this.service.finalize(session, id);
	}

	@Get(":id/download-url")
	@ApiOperation({ summary: "Return a short-lived authenticated download URL" })
	@ApiResponse({ status: 200, description: "Download URL returned" })
	async downloadUrl(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "file:read");
		return this.service.downloadUrl(session, id);
	}
}
