const WORKER_ROLE_SEQUENCE = [
	"house_maid",
	"nanny",
	"cook",
	"chef",
	"line_cook",
	"dishwasher",
	"barista",
	"waiter",
	"cleaner",
	"guard",
	"driver",
] as const;

const ROLE_LABEL_BY_ID = {
	house_maid: "household support worker",
	nanny: "childcare worker",
	cook: "home cook",
	chef: "chef",
	line_cook: "line cook",
	dishwasher: "kitchen steward",
	barista: "barista",
	waiter: "restaurant server",
	cleaner: "cleaner",
	guard: "security guard",
	driver: "driver",
} as const satisfies Record<WorkerRoleId, string>;

const ROLE_GENDER = {
	house_maid: "F",
	nanny: "F",
	cook: "F",
	chef: "M",
	line_cook: "M",
	dishwasher: "M",
	barista: "F",
	waiter: "M",
	cleaner: "F",
	guard: "M",
	driver: "M",
} as const satisfies Record<WorkerRoleId, "F" | "M">;

const FEMALE_FIRST_NAMES = [
	"Abeba",
	"Alemnesh",
	"Almaz",
	"Aster",
	"Bethel",
	"Bethlehem",
	"Dagmawit",
	"Eden",
	"Elsabet",
	"Feven",
	"Genet",
	"Hana",
	"Hirut",
	"Kidist",
	"Lemlem",
	"Mahlet",
	"Mekdes",
	"Meron",
	"Rahel",
	"Selam",
	"Senait",
	"Tigist",
	"Tsion",
	"Wubit",
	"Yordanos",
] as const;

const MALE_FIRST_NAMES = [
	"Abel",
	"Abenezer",
	"Addisu",
	"Bereket",
	"Biruk",
	"Dawit",
	"Endale",
	"Eyob",
	"Fitsum",
	"Getachew",
	"Henok",
	"Kaleb",
	"Kirubel",
	"Natnael",
	"Robel",
	"Samuel",
	"Solomon",
	"Tamrat",
	"Tesfaye",
	"Yared",
	"Yonas",
	"Yosef",
	"Zelalem",
	"Zerihun",
	"Zewdu",
] as const;

const FATHER_NAMES = [
	"Abate",
	"Alemu",
	"Asfaw",
	"Bekele",
	"Berhanu",
	"Demissie",
	"Eshetu",
	"Fikre",
	"Girma",
	"Hailu",
	"Kebede",
	"Legesse",
	"Mekonnen",
	"Negash",
	"Reda",
	"Seyoum",
	"Tadesse",
	"Tefera",
	"Wolde",
	"Worku",
] as const;

const GRANDFATHER_NAMES = [
	"Adane",
	"Amare",
	"Balcha",
	"Chala",
	"Desta",
	"Fanta",
	"Gebre",
	"Haile",
	"Jemberu",
	"Kassa",
	"Melaku",
	"Nega",
	"Shiferaw",
	"Tola",
	"Wondimu",
] as const;

const LANGUAGE_SETS = [["am"], ["am", "en"], ["am", "om"], ["am", "ti"], ["am", "ar"]] as const;

const TIER_SEQUENCE = ["basic", "verified", "trained", "trusted"] as const;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COVERAGE_PHONE_BASE = 40_000_000;
const COVERAGE_FAYDA_FIRST_BASE = 3_000;
const COVERAGE_FAYDA_SECOND_BASE = 5_000;
const RATING_BASE = 3.8;
const RATING_STEP = 0.1;
const RATING_CYCLE = 11;
const NO_RATING_MODULO = 7;

type WorkerRoleId = (typeof WORKER_ROLE_SEQUENCE)[number];

export type SeedWorkerInput = {
	readonly fullName: string;
	readonly fayda: string;
	readonly phone: string;
	readonly gender: "F" | "M";
	readonly area: string;
	readonly languages: readonly string[];
	readonly experienceYears: number;
	readonly hasHealthCard: boolean;
	readonly hasPoliceClearance: boolean;
	readonly roles: readonly string[];
	readonly agentId: string;
	readonly stationId: string;
	readonly bio: string;
	readonly tier: string;
	readonly ratingAverage: number | null;
};

export type CoverageWorkerLocality = {
	readonly localityCode: string;
	readonly localityName: string;
	readonly parentName: string;
	readonly stationId: string;
	readonly agentId: string;
};

const pick = <T>(values: readonly T[], index: number): T => {
	const value = values[index % values.length];
	if (typeof value === "undefined") {
		throw new Error("Cannot select from an empty seed list");
	}
	return value;
};

const alphaCode = (index: number): string => {
	const first = ALPHABET.charAt(Math.floor(index / ALPHABET.length) % ALPHABET.length);
	const second = ALPHABET.charAt(index % ALPHABET.length);
	return `${first}${second}`;
};

const fullNameFor = (gender: "F" | "M", index: number): string => {
	const firstNames = gender === "F" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
	return `${pick(firstNames, index)} ${pick(FATHER_NAMES, index + 3)} ${pick(GRANDFATHER_NAMES, index + 7)}`;
};

const ratingFor = (index: number): number | null => {
	if (index % NO_RATING_MODULO === 0) {
		return null;
	}
	return Number((RATING_BASE + (index % RATING_CYCLE) * RATING_STEP).toFixed(1));
};

export const buildCoverageWorkers = ({
	localities,
	startIndex,
}: {
	readonly localities: readonly CoverageWorkerLocality[];
	readonly startIndex: number;
}): readonly SeedWorkerInput[] =>
	localities.map((locality, index) => {
		const seedIndex = startIndex + index;
		const roleId = pick(WORKER_ROLE_SEQUENCE, seedIndex);
		const gender = ROLE_GENDER[roleId];
		const paddedWorkerNumber = String(seedIndex + 1).padStart(4, "0");
		return {
			fullName: fullNameFor(gender, seedIndex),
			fayda: `F-${COVERAGE_FAYDA_FIRST_BASE + seedIndex}-${COVERAGE_FAYDA_SECOND_BASE + seedIndex}-${alphaCode(seedIndex)}`,
			phone: `+2519${String(COVERAGE_PHONE_BASE + seedIndex).padStart(8, "0")}`,
			gender,
			area: locality.localityCode,
			languages: pick(LANGUAGE_SETS, seedIndex),
			experienceYears: seedIndex % RATING_CYCLE,
			hasHealthCard: seedIndex % 2 === 0,
			hasPoliceClearance: seedIndex % 3 === 0,
			roles: [roleId],
			agentId: locality.agentId,
			stationId: locality.stationId,
			bio: `${ROLE_LABEL_BY_ID[roleId]} registered at ${locality.parentName}, ${locality.localityName}. Coverage worker ${paddedWorkerNumber} for locality-based demo and filter testing.`,
			tier: pick(TIER_SEQUENCE, seedIndex),
			ratingAverage: ratingFor(seedIndex),
		};
	});
