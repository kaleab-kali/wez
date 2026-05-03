import React from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_NAMES, type Language, SUPPORTED_LANGUAGES } from "#shared/i18n/config";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const LanguageSwitcher = React.memo(
	() => {
		const { i18n, t } = useTranslation();
		const current = i18n.language as Language;

		const change = React.useCallback(
			(lng: Language) => {
				void i18n.changeLanguage(lng);
				document.documentElement.lang = lng;
			},
			[i18n],
		);

		React.useEffect(() => {
			document.documentElement.lang = current;
		}, [current]);

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" aria-label={t("topbar.language")}>
						{LANGUAGE_NAMES[current] ?? LANGUAGE_NAMES.en}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{SUPPORTED_LANGUAGES.map((lng) => (
						<DropdownMenuItem key={lng} onClick={() => change(lng)}>
							{LANGUAGE_NAMES[lng]}
							{current === lng && <span className="ml-2 text-primary">✓</span>}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
	() => true,
);
LanguageSwitcher.displayName = "LanguageSwitcher";
