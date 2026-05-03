import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { am } from "./locales/am";
import { en } from "./locales/en";

export const SUPPORTED_LANGUAGES = ["en", "am"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
	en: "English",
	am: "አማርኛ",
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			am: { translation: am },
		},
		fallbackLng: "en",
		supportedLngs: SUPPORTED_LANGUAGES,
		interpolation: { escapeValue: false },
		detection: {
			order: ["localStorage", "navigator"],
			caches: ["localStorage"],
			lookupLocalStorage: "wez.lang",
		},
	});

export default i18n;
