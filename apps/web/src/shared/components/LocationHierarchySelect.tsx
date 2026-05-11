import React from "react";
import { useTranslation } from "react-i18next";
import { type Location, usePublicLocations } from "#features/locations/api/location.queries";
import { Label } from "@/components/ui/label";

export type LocationHierarchySelection = {
	readonly adminAreaId?: string;
	readonly subAreaId?: string;
	readonly localityId?: string;
	readonly localityCode?: string;
};

type LocationHierarchySelectProps = {
	readonly value: LocationHierarchySelection;
	readonly onChange: (value: LocationHierarchySelection) => void;
	readonly required?: boolean;
	readonly includeAny?: boolean;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly idPrefix?: string;
};

const selectClassName =
	"w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const EMPTY_SELECTION: LocationHierarchySelection = {};

export const LocationHierarchySelect = React.memo(
	({
		value,
		onChange,
		required = false,
		includeAny = false,
		disabled = false,
		className = "grid gap-3 md:grid-cols-3",
		idPrefix = "location",
	}: LocationHierarchySelectProps) => {
		const { t } = useTranslation();
		const { data: adminAreas } = usePublicLocations({ kind: "admin_area" });
		const { data: subAreas } = usePublicLocations({
			kind: "sub_area",
			parentId: value.adminAreaId || undefined,
		});
		const { data: localities } = usePublicLocations({
			kind: "locality",
			parentId: value.subAreaId || undefined,
		});

		const availableSubAreas = React.useMemo(
			() => (value.adminAreaId ? (subAreas ?? []).filter((area) => area.parentId === value.adminAreaId) : []),
			[subAreas, value.adminAreaId],
		);
		const availableLocalities = React.useMemo(
			() => (value.subAreaId ? (localities ?? []).filter((locality) => locality.parentId === value.subAreaId) : []),
			[localities, value.subAreaId],
		);

		const placeholder = includeAny ? t("common.any") : "-";

		const handleAdminAreaChange = React.useCallback(
			(event: React.ChangeEvent<HTMLSelectElement>) => {
				const adminAreaId = event.target.value || undefined;
				onChange(adminAreaId ? { adminAreaId } : EMPTY_SELECTION);
			},
			[onChange],
		);

		const handleSubAreaChange = React.useCallback(
			(event: React.ChangeEvent<HTMLSelectElement>) => {
				const subAreaId = event.target.value || undefined;
				onChange({
					adminAreaId: value.adminAreaId,
					subAreaId,
				});
			},
			[onChange, value.adminAreaId],
		);

		const handleLocalityChange = React.useCallback(
			(event: React.ChangeEvent<HTMLSelectElement>) => {
				const localityId = event.target.value || undefined;
				const locality = availableLocalities.find((item) => item.id === localityId);
				onChange({
					adminAreaId: value.adminAreaId,
					subAreaId: value.subAreaId,
					localityId,
					localityCode: locality?.code,
				});
			},
			[availableLocalities, onChange, value.adminAreaId, value.subAreaId],
		);

		return (
			<div className={className}>
				<LocationSelect
					id={`${idPrefix}-admin-area`}
					label={t("locations.adminArea")}
					value={value.adminAreaId ?? ""}
					onChange={handleAdminAreaChange}
					options={adminAreas ?? []}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
				/>
				<LocationSelect
					id={`${idPrefix}-sub-area`}
					label={t("locations.subArea")}
					value={value.subAreaId ?? ""}
					onChange={handleSubAreaChange}
					options={availableSubAreas}
					placeholder={placeholder}
					required={required}
					disabled={disabled || !value.adminAreaId}
				/>
				<LocationSelect
					id={`${idPrefix}-locality`}
					label={t("locations.locality")}
					value={value.localityId ?? ""}
					onChange={handleLocalityChange}
					options={availableLocalities}
					placeholder={placeholder}
					required={required}
					disabled={disabled || !value.subAreaId}
				/>
			</div>
		);
	},
);
LocationHierarchySelect.displayName = "LocationHierarchySelect";

const LocationSelect = React.memo(
	({
		id,
		label,
		value,
		onChange,
		options,
		placeholder,
		required,
		disabled,
	}: {
		readonly id: string;
		readonly label: string;
		readonly value: string;
		readonly onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
		readonly options: readonly Location[];
		readonly placeholder: string;
		readonly required: boolean;
		readonly disabled: boolean;
	}) => (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<select
				id={id}
				value={value}
				onChange={onChange}
				required={required}
				disabled={disabled}
				className={selectClassName}
			>
				<option value="">{placeholder}</option>
				{options.map((option) => (
					<option key={option.id} value={option.id}>
						{option.nameEn}
					</option>
				))}
			</select>
		</div>
	),
);
LocationSelect.displayName = "LocationSelect";
