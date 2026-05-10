# Phase F0 Delayed Critical Gaps

This document tracks Phase F0 gaps that were intentionally separated from the current role-access/location PR because they require focused security and product work. Do not mark Phase F0 fully closed until these are resolved and tested.

Source plan: `docs/staff-access-location-plan.md`.

## Status Summary

Phase F0 core access, location, station, sidebar, and role-gated UI work is implemented. The remaining gaps are security-sensitive and should be handled before production use of staff onboarding.

## Gap 1: Staff Phone Is Accepted But Not Persisted

Current behavior:
- `CreateStaffUserDto` accepts `phone`.
- `AdminUser` has no phone field.
- Staff user creation UI does not collect phone.
- The submitted phone value is not saved or displayed.

Risk:
- Staff onboarding plan requires name, email, and phone.
- SMS fallback, future 2FA fallback, support workflows, and audit investigations cannot reliably contact staff.
- API contract is misleading because it accepts data that is discarded.

Required fix:
- Add a staff phone field to the admin user model or a dedicated staff profile model.
- Persist phone during staff creation/update.
- Display phone in Staff Users and Access Review where appropriate.
- Validate Ethiopian phone format consistently.
- Decide whether phone must be unique for staff accounts.

Acceptance criteria:
- HR or super admin can enter staff phone during creation.
- Phone persists after reload.
- Staff phone appears in staff detail/list views.
- Invalid phone formats are rejected.
- Existing staff without phone continue to load safely.
- Audit event metadata records whether phone was added or changed without exposing unnecessary PII.

## Gap 2: First-Login Password Change Is Not Enforced

Current behavior:
- Temporary passwords are generated or manually provided.
- Staff can sign in with the temporary password.
- There is no forced password-change state.

Risk:
- Temporary passwords can become long-lived credentials.
- HR/admin onboarding is weaker than expected for enterprise staff access.
- Compromise risk is higher if a temporary password is shared over insecure channels.

Required fix:
- Add a persistent flag such as `mustChangePassword` or `passwordResetRequired`.
- Set the flag for newly created staff users.
- After successful temporary-password login, redirect staff to a password change screen before any app route.
- Clear the flag only after successful password change.
- Invalidate existing sessions after password change.

Acceptance criteria:
- Newly created staff cannot access dashboard before changing password.
- Existing seeded/dev users are either migrated with the flag disabled or intentionally prompted.
- Password policy matches Better Auth minimums and project rules.
- Sessions are refreshed or revoked correctly after password change.
- Playwright verifies first login -> forced change -> dashboard access.

## Gap 3: 2FA Setup Exists But Is Not Enforced

Current behavior:
- Better Auth admin 2FA plugin is configured.
- Staff can open the Two-factor page and enable TOTP.
- Staff can still use the system without completing 2FA setup.

Risk:
- F0/F1 staff access plan expects HQ/staff accounts to require 2FA.
- High-privilege roles can operate with password-only authentication.
- Role-gated UI is not enough if account-level authentication is weak.

Required fix:
- Define which roles must complete 2FA before using staff routes.
- Enforce 2FA setup for required staff roles after login.
- Allow only safe routes during setup, such as `/staff-admin/2fa`, sign out, and maybe sessions.
- Keep agents/supervisors aligned with the current business decision: if all staff must use 2FA, enforce it consistently; if only HQ roles require it, document the exception.
- Ensure trusted-device behavior is configured and tested if used.

Acceptance criteria:
- A required staff user without 2FA is redirected to setup.
- The user cannot access operational/admin pages until 2FA is enabled.
- A user with 2FA enabled can access allowed routes normally.
- Direct URL navigation cannot bypass setup enforcement.
- Playwright verifies no-2FA blocked access and enabled-2FA access.

## Gap 4: Permission Documentation Drift

Current behavior:
- `docs/PERMISSIONS_GUIDE.md` still references older tenant-role assumptions for some staff roles.
- Current implementation has agents, station supervisors, and instructors in admin/staff auth.
- Effective access is now primary role plus active role assignments.

Risk:
- Future implementation may follow outdated documentation.
- New contributors may put staff roles back into tenant auth or create conflicting guards.
- Permission bugs are harder to review because docs and code disagree.

Required fix:
- Update `docs/PERMISSIONS_GUIDE.md` to reflect current staff auth architecture.
- Clarify role stacking and scoped assignments.
- Define which routes/actions are read-only, operational, or administrative.
- Keep backend permissions and frontend capability groups aligned.

Acceptance criteria:
- Docs clearly state staff roles live in admin/staff auth.
- Docs describe primary role plus role assignments.
- Permission matrix matches `apps/api/src/modules/auth/permissions.ts` and `apps/web/src/shared/lib/staff-roles.ts`.
- Agents, supervisors, HQ managers, support, instructor, and executive viewer have clear allowed/blocked actions.

## Recommended Implementation Order

1. Persist staff phone.
2. Enforce first-login password change.
3. Enforce required 2FA setup.
4. Update permission documentation after the security behavior is final.

## Required Final Verification

Before closing these gaps:

- Run `pnpm lint`.
- Run `pnpm typecheck:api`.
- Run `pnpm typecheck:web`.
- Run `pnpm build:api`.
- Run `pnpm build:web`.
- Test with Playwright CLI using headed persistent sessions for:
  - super admin
  - ops manager
  - HR/finance stacked user
  - station supervisor
  - agent
  - executive viewer

