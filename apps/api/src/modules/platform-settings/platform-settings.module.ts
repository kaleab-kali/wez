import { Module } from "@nestjs/common";
import { PlatformSettingsService } from "./application/services/platform-settings.service";
import { PlatformSettingsController } from "./presentation/controllers/platform-settings.controller";

@Module({
	controllers: [PlatformSettingsController],
	providers: [PlatformSettingsService],
	exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
