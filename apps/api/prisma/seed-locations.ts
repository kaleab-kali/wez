import type { prisma } from "../src/shared/database/prisma-instance";

const LOCATION_KIND = {
	adminArea: "admin_area",
	subArea: "sub_area",
	locality: "locality",
} as const;

const LOCATION_TYPE = {
	cityAdministration: "city_administration",
	region: "region",
	subcity: "subcity",
	zone: "zone",
	woreda: "woreda",
	kebele: "kebele",
} as const;

const ADDIS_ABABA_CODE = "aa";

const ADMIN_AREAS = [
	{
		code: ADDIS_ABABA_CODE,
		type: LOCATION_TYPE.cityAdministration,
		nameEn: "Addis Ababa City Administration",
		nameAm: "Addis Ababa City Administration",
		sortOrder: 1,
	},
	{
		code: "sidama",
		type: LOCATION_TYPE.region,
		nameEn: "Sidama Region",
		nameAm: "Sidama Region",
		sortOrder: 2,
	},
	{
		code: "oromia",
		type: LOCATION_TYPE.region,
		nameEn: "Oromia Region",
		nameAm: "Oromia Region",
		sortOrder: 3,
	},
	{
		code: "amhara",
		type: LOCATION_TYPE.region,
		nameEn: "Amhara Region",
		nameAm: "Amhara Region",
		sortOrder: 4,
	},
	{
		code: "dire-dawa",
		type: LOCATION_TYPE.cityAdministration,
		nameEn: "Dire Dawa City Administration",
		nameAm: "Dire Dawa City Administration",
		sortOrder: 5,
	},
] as const;

export const ADDIS_ABABA_SUBCITIES = [
	{ code: "aa-addis-ketema", nameEn: "Addis Ketema Subcity", woredaCount: 14, sortOrder: 1 },
	{ code: "aa-akaki-kality", nameEn: "Akaki Kality Subcity", woredaCount: 13, sortOrder: 2 },
	{ code: "aa-arada", nameEn: "Arada Subcity", woredaCount: 10, sortOrder: 3 },
	{ code: "aa-bole", nameEn: "Bole Subcity", woredaCount: 15, sortOrder: 4 },
	{ code: "aa-gulele", nameEn: "Gulele Subcity", woredaCount: 10, sortOrder: 5 },
	{ code: "aa-kirkos", nameEn: "Kirkos Subcity", woredaCount: 11, sortOrder: 6 },
	{ code: "aa-kolfe-keraniyo", nameEn: "Kolfe Keraniyo Subcity", woredaCount: 15, sortOrder: 7 },
	{ code: "aa-lemi-kura", nameEn: "Lemi Kura Subcity", woredaCount: 14, sortOrder: 8 },
	{ code: "aa-lideta", nameEn: "Lideta Subcity", woredaCount: 10, sortOrder: 9 },
	{ code: "aa-nifas-silk-lafto", nameEn: "Nifas Silk Lafto Subcity", woredaCount: 15, sortOrder: 10 },
	{ code: "aa-yeka", nameEn: "Yeka Subcity", woredaCount: 13, sortOrder: 11 },
] as const;

const EXTRA_SUB_AREAS = [
	{
		code: "sidama-hawassa",
		parentCode: "sidama",
		type: LOCATION_TYPE.zone,
		nameEn: "Hawassa City Administration",
		nameAm: "Hawassa City Administration",
		sortOrder: 1,
	},
	{
		code: "oromia-sheger",
		parentCode: "oromia",
		type: LOCATION_TYPE.zone,
		nameEn: "Sheger City Zone",
		nameAm: "Sheger City Zone",
		sortOrder: 1,
	},
	{
		code: "amhara-bahir-dar",
		parentCode: "amhara",
		type: LOCATION_TYPE.zone,
		nameEn: "Bahir Dar Zone",
		nameAm: "Bahir Dar Zone",
		sortOrder: 1,
	},
	{
		code: "dire-dawa-urban",
		parentCode: "dire-dawa",
		type: LOCATION_TYPE.zone,
		nameEn: "Dire Dawa Urban Zone",
		nameAm: "Dire Dawa Urban Zone",
		sortOrder: 1,
	},
] as const;

const EXTRA_LOCALITIES = [
	{
		code: "sidama-hawassa-tabor-k01",
		parentCode: "sidama-hawassa",
		type: LOCATION_TYPE.kebele,
		nameEn: "Tabor Kebele 01",
		nameAm: "Tabor Kebele 01",
		sortOrder: 1,
	},
	{
		code: "sidama-hawassa-menaharia-k02",
		parentCode: "sidama-hawassa",
		type: LOCATION_TYPE.kebele,
		nameEn: "Menaharia Kebele 02",
		nameAm: "Menaharia Kebele 02",
		sortOrder: 2,
	},
	{
		code: "sidama-hawassa-haik-dar-k03",
		parentCode: "sidama-hawassa",
		type: LOCATION_TYPE.kebele,
		nameEn: "Haik Dar Kebele 03",
		nameAm: "Haik Dar Kebele 03",
		sortOrder: 3,
	},
	{
		code: "oromia-sheger-furi-k01",
		parentCode: "oromia-sheger",
		type: LOCATION_TYPE.kebele,
		nameEn: "Furi Kebele 01",
		nameAm: "Furi Kebele 01",
		sortOrder: 1,
	},
	{
		code: "oromia-sheger-gelan-guda-k02",
		parentCode: "oromia-sheger",
		type: LOCATION_TYPE.kebele,
		nameEn: "Gelan Guda Kebele 02",
		nameAm: "Gelan Guda Kebele 02",
		sortOrder: 2,
	},
	{
		code: "oromia-sheger-lega-tafo-k03",
		parentCode: "oromia-sheger",
		type: LOCATION_TYPE.kebele,
		nameEn: "Lega Tafo Kebele 03",
		nameAm: "Lega Tafo Kebele 03",
		sortOrder: 3,
	},
	{
		code: "amhara-bahir-dar-k01",
		parentCode: "amhara-bahir-dar",
		type: LOCATION_TYPE.kebele,
		nameEn: "Bahir Dar Kebele 01",
		nameAm: "Bahir Dar Kebele 01",
		sortOrder: 1,
	},
	{
		code: "amhara-bahir-dar-k02",
		parentCode: "amhara-bahir-dar",
		type: LOCATION_TYPE.kebele,
		nameEn: "Bahir Dar Kebele 02",
		nameAm: "Bahir Dar Kebele 02",
		sortOrder: 2,
	},
	{
		code: "amhara-bahir-dar-k03",
		parentCode: "amhara-bahir-dar",
		type: LOCATION_TYPE.kebele,
		nameEn: "Bahir Dar Kebele 03",
		nameAm: "Bahir Dar Kebele 03",
		sortOrder: 3,
	},
	{
		code: "dire-dawa-urban-k01",
		parentCode: "dire-dawa-urban",
		type: LOCATION_TYPE.kebele,
		nameEn: "Dire Dawa Urban Kebele 01",
		nameAm: "Dire Dawa Urban Kebele 01",
		sortOrder: 1,
	},
	{
		code: "dire-dawa-urban-k02",
		parentCode: "dire-dawa-urban",
		type: LOCATION_TYPE.kebele,
		nameEn: "Dire Dawa Urban Kebele 02",
		nameAm: "Dire Dawa Urban Kebele 02",
		sortOrder: 2,
	},
	{
		code: "dire-dawa-urban-k03",
		parentCode: "dire-dawa-urban",
		type: LOCATION_TYPE.kebele,
		nameEn: "Dire Dawa Urban Kebele 03",
		nameAm: "Dire Dawa Urban Kebele 03",
		sortOrder: 3,
	},
] as const;

type PrismaClient = typeof prisma;
type SeededLocation = Awaited<ReturnType<PrismaClient["location"]["create"]>>;

const mustGet = <T>(map: ReadonlyMap<string, T>, code: string): T => {
	const value = map.get(code);
	if (!value) {
		throw new Error(`Missing seeded location for code ${code}`);
	}
	return value;
};

const addisLocalityDefinitions = () =>
	ADDIS_ABABA_SUBCITIES.flatMap((subcity) =>
		Array.from({ length: subcity.woredaCount }, (_, index) => {
			const woredaNumber = index + 1;
			const padded = String(woredaNumber).padStart(2, "0");
			return {
				code: `${subcity.code}-w${padded}`,
				parentCode: subcity.code,
				type: LOCATION_TYPE.woreda,
				nameEn: `Woreda ${padded}`,
				nameAm: `Woreda ${padded}`,
				sortOrder: woredaNumber,
			};
		}),
	);

export const seedLocationHierarchy = async (prismaClient: PrismaClient) => {
	const adminAreaByCode = new Map<string, SeededLocation>();
	const subAreaByCode = new Map<string, SeededLocation>();
	const localityByCode = new Map<string, SeededLocation>();

	for (const adminArea of ADMIN_AREAS) {
		const created = await prismaClient.location.upsert({
			where: { code: adminArea.code },
			update: {
				code: adminArea.code,
				kind: LOCATION_KIND.adminArea,
				type: adminArea.type,
				nameEn: adminArea.nameEn,
				nameAm: adminArea.nameAm,
				sortOrder: adminArea.sortOrder,
			},
			create: {
				code: adminArea.code,
				kind: LOCATION_KIND.adminArea,
				type: adminArea.type,
				nameEn: adminArea.nameEn,
				nameAm: adminArea.nameAm,
				sortOrder: adminArea.sortOrder,
			},
		});
		adminAreaByCode.set(adminArea.code, created);
	}

	for (const subcity of ADDIS_ABABA_SUBCITIES) {
		const created = await prismaClient.location.upsert({
			where: { code: subcity.code },
			update: {
				code: subcity.code,
				kind: LOCATION_KIND.subArea,
				type: LOCATION_TYPE.subcity,
				nameEn: subcity.nameEn,
				nameAm: subcity.nameEn,
				parentId: mustGet(adminAreaByCode, ADDIS_ABABA_CODE).id,
				sortOrder: subcity.sortOrder,
			},
			create: {
				code: subcity.code,
				kind: LOCATION_KIND.subArea,
				type: LOCATION_TYPE.subcity,
				nameEn: subcity.nameEn,
				nameAm: subcity.nameEn,
				parentId: mustGet(adminAreaByCode, ADDIS_ABABA_CODE).id,
				sortOrder: subcity.sortOrder,
			},
		});
		subAreaByCode.set(subcity.code, created);
	}

	for (const subArea of EXTRA_SUB_AREAS) {
		const created = await prismaClient.location.upsert({
			where: { code: subArea.code },
			update: {
				code: subArea.code,
				kind: LOCATION_KIND.subArea,
				type: subArea.type,
				nameEn: subArea.nameEn,
				nameAm: subArea.nameAm,
				parentId: mustGet(adminAreaByCode, subArea.parentCode).id,
				sortOrder: subArea.sortOrder,
			},
			create: {
				code: subArea.code,
				kind: LOCATION_KIND.subArea,
				type: subArea.type,
				nameEn: subArea.nameEn,
				nameAm: subArea.nameAm,
				parentId: mustGet(adminAreaByCode, subArea.parentCode).id,
				sortOrder: subArea.sortOrder,
			},
		});
		subAreaByCode.set(subArea.code, created);
	}

	const addisDefinitions = addisLocalityDefinitions();
	for (const locality of [...addisDefinitions, ...EXTRA_LOCALITIES]) {
		const created = await prismaClient.location.upsert({
			where: { code: locality.code },
			update: {
				code: locality.code,
				kind: LOCATION_KIND.locality,
				type: locality.type,
				nameEn: locality.nameEn,
				nameAm: locality.nameAm,
				parentId: mustGet(subAreaByCode, locality.parentCode).id,
				sortOrder: locality.sortOrder,
			},
			create: {
				code: locality.code,
				kind: LOCATION_KIND.locality,
				type: locality.type,
				nameEn: locality.nameEn,
				nameAm: locality.nameAm,
				parentId: mustGet(subAreaByCode, locality.parentCode).id,
				sortOrder: locality.sortOrder,
			},
		});
		localityByCode.set(locality.code, created);
	}

	return {
		adminAreas: [...adminAreaByCode.values()],
		subAreas: [...subAreaByCode.values()],
		localities: [...localityByCode.values()],
		adminAreaByCode,
		subAreaByCode,
		localityByCode,
		addisSubAreas: ADDIS_ABABA_SUBCITIES.map((subcity) => mustGet(subAreaByCode, subcity.code)),
		addisLocalities: addisDefinitions.map((locality) => mustGet(localityByCode, locality.code)),
		extraLocalities: EXTRA_LOCALITIES.map((locality) => mustGet(localityByCode, locality.code)),
	};
};
