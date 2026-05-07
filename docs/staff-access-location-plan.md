# Staff Access, Locations, and Stations Plan

## Location Hierarchy

Use exactly three administrative levels:

1. `admin_area` - top-level area, such as Addis Ababa City Administration or Sidama Region.
2. `sub_area` - subcity, zone, or city administration under the admin area.
3. `locality` - woreda or kebele.

Locations are lookup-managed reference data, not hardcoded application constants. Admins can add new admin areas, sub-areas, and localities when operations expand.

## Lookup-Managed Location Records

Each location record has:

- `id`
- `code`
- `name_en`
- `name_am`
- `kind`
- `parent_id`
- `active`
- `sort_order`
- `created_at`
- `updated_at`
- `deleted_at`

Seed starter data for Addis Ababa and Sidama/Hawassa. Soft-delete only. If a location is used by a station, disable it instead of deleting it.

## Stations

A normal station belongs to exactly one locality. Station creation normally follows:

1. Select admin area.
2. Select sub-area.
3. Select locality.
4. System creates the station from the locality.

Default station names are generated from the locality, such as `Bole Woreda 03 Station` or `Tabor Kebele 01 Station`.

Rare custom stations are allowed only for high-level access (`super_admin` or `ops_manager`), require a reason, and are audit logged.

## Staff Multi-Role Model

One staff person can hold multiple roles. Keep a primary role for display/default navigation, and add role assignments for effective access.

Role assignment fields:

- `admin_user_id`
- `role`
- `scope_type`
- `scope_id`
- `active`
- `assigned_by`
- `assigned_at`
- `revoked_at`

Scope types:

- `global`
- `admin_area`
- `sub_area`
- `locality`
- `station`

Effective permissions are the union of active role assignments. Data access still requires object-level scope checks.

## Staff Roles

- `super_admin`: global system control.
- `ops_manager`: broad operations, stations, reports, escalations.
- `hr_manager`: staff creation, onboarding, deactivation.
- `finance_manager`: payments, commissions, finance reports.
- `compliance_officer`: complaints, audit, external referral.
- `training_manager`: courses, instructors, enrollment.
- `station_supervisor`: scoped supervision across one or more sub-areas, localities, or stations.
- `agent`: assigned station operations.
- `support`: tickets and support triage.
- `executive_viewer`: read-only dashboards and reports.
- `it_manager`: platform/security/API settings.

Higher title does not automatically mean operational mutation. Managers can observe and approve; agents and scoped supervisors operate in assigned scopes.

## Admin UI

Add and clean super admin navigation:

- Staff users
- Role assignments
- Locations
- Stations
- Access review
- Audit log

## Staff Onboarding

1. HR or super admin creates staff user.
2. Adds name, email, phone.
3. Sets primary role.
4. Adds role assignments.
5. Adds scope per role.
6. Creates temporary password or invite.
7. Requires password change on first login.
8. Requires 2FA.
9. If agent or supervisor, assigns station, locality, or sub-area scope.
10. Audit records every change.

## Implementation Order

1. Add lookup-backed location schema.
2. Seed Addis Ababa and Sidama/Hawassa starter hierarchy.
3. Update station schema to use `locality_id`.
4. Add staff role assignment schema.
5. Update permission resolver for multi-role union.
6. Add scope resolver for station/locality/sub-area access.
7. Build staff users backend.
8. Build location/station admin backend.
9. Build staff users UI.
10. Build locations/stations UI.
11. Update sidebar.
12. Add audit events.
13. Verify with Playwright across super admin, stacked HR/finance user, supervisor, agent, and executive viewer.
