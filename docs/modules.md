# Wez Platform — Module & Feature Specification

This document lists every module in the system with deeply nested feature breakdowns. The goal is to give Claude Code a precise specification that maps to backend modules and frontend pages.

Items marked `[P1]` are Phase 1 (MVP). `[P2]` Phase 2. `[P3]` Phase 3. `[L]` later/optional.

---

## 1. Authentication & Sessions [P1]

- 1.1 Login flows
  - 1.1.1 Email + password (HQ staff, agents, businesses)
    - 1.1.1.1 Form: email, password, "remember me" checkbox
    - 1.1.1.2 Validation: email format, password not empty
    - 1.1.1.3 Rate limit: 5 attempts per 15 min per IP+email combo
      - 1.1.1.3.1 After 5 fails, account locked 15 min
      - 1.1.1.3.2 6th attempt shows "account locked, try again in N min"
    - 1.1.1.4 Successful login
      - 1.1.1.4.1 Create session row (Better Auth)
      - 1.1.1.4.2 Set httpOnly secure cookie
      - 1.1.1.4.3 Reset failed_login_count
      - 1.1.1.4.4 Update last_login_at
      - 1.1.1.4.5 Audit event `auth.login`
    - 1.1.1.5 Failed login
      - 1.1.1.5.1 Increment failed_login_count
      - 1.1.1.5.2 Generic error message (don't leak whether account exists)
  - 1.1.2 Phone + OTP (workers, household employers)
    - 1.1.2.1 Form: phone number with +251 prefix locked
    - 1.1.2.2 Send OTP via SMS (Afromessage)
      - 1.1.2.2.1 6-digit numeric code
      - 1.1.2.2.2 Valid for 5 minutes
      - 1.1.2.2.3 Rate limit: 3 OTP requests per phone per 15 min
    - 1.1.2.3 Verify OTP
      - 1.1.2.3.1 Match must be exact
      - 1.1.2.3.2 Used codes are immediately invalidated
      - 1.1.2.3.3 3 wrong attempts: code invalidated, request new
    - 1.1.2.4 Successful verification → session created
  - 1.1.3 2FA for HQ staff [P1]
    - 1.1.3.1 SMS-based, 6-digit code
    - 1.1.3.2 Required on login, not on every request
    - 1.1.3.3 Trusted device cookie valid 30 days
- 1.2 Logout
  - 1.2.1 Revoke session row (Better Auth)
  - 1.2.2 Clear cookie
  - 1.2.3 Audit event `auth.logout`
- 1.3 Password reset (email-based, HQ + business only)
  - 1.3.1 Request: email submitted, sends reset link
    - 1.3.1.1 Token valid 1 hour, single-use
    - 1.3.1.2 Always returns success message even if email doesn't exist
  - 1.3.2 Confirm: new password form
    - 1.3.2.1 Same password rules as registration
    - 1.3.2.2 On success: invalidate all existing sessions
- 1.4 Session management
  - 1.4.1 Sliding expiration (30-day max, refreshed on activity)
  - 1.4.2 List sessions in user settings
  - 1.4.3 Revoke individual session
- 1.5 Role-based access
  - 1.5.1 Role assigned at user creation, immutable except via admin action
  - 1.5.2 Guards on every API endpoint check role
  - 1.5.3 Frontend route guards check role before render
  - 1.5.4 Switching role requires logout + login as different user

---

## 2. User profiles [P1]

- 2.1 Profile types
  - 2.1.1 `users` — base auth identity
  - 2.1.2 `workers` — worker profile (1:1 with user OR agent-managed)
  - 2.1.3 `employers` — employer profile (1:1 with user OR agent-managed)
  - 2.1.4 `agent_assignments` — agents linked to stations via this table
  - 2.1.5 `hq_staff` profile (lightweight; user table covers it)
- 2.2 Profile completion rules
  - 2.2.1 Worker: full_name + fayda + phone + at least one role + area required
  - 2.2.2 Business employer: name + tin + license + phone + area required
  - 2.2.3 Household employer: name + fayda + phone + area required
  - 2.2.4 Profiles can exist without a `user_id` if agent-managed
    - 2.2.4.1 If user later wants login, agent links the user to existing profile
- 2.3 Profile editing
  - 2.3.1 Worker can edit: bio, languages (only). Cannot edit fayda, name, age, etc.
  - 2.3.2 Agent can edit any worker field
  - 2.3.3 Employer (business) can edit: contact name, phone, email
  - 2.3.4 Critical fields (tin, license, fayda) require admin action to change
  - 2.3.5 Every edit creates an audit event with before/after JSON

---

## 3. Worker management [P1]

- 3.1 Worker registration (agent-led)
  - 3.1.1 Step 1: Identity
    - 3.1.1.1 Capture: full_name, fayda, phone, date_of_birth, gender, area
    - 3.1.1.2 Fayda format validation (regex)
    - 3.1.1.3 Phone uniqueness check
    - 3.1.1.4 Fayda uniqueness check
    - 3.1.1.5 Photo capture (camera or upload, stored encrypted)
  - 3.1.2 Step 2: Skills & background
    - 3.1.2.1 Languages selection (multi-select chips)
    - 3.1.2.2 Religion (optional, default "Prefer not to say")
    - 3.1.2.3 Roles (multi-select grouped by category)
    - 3.1.2.4 Years of experience
    - 3.1.2.5 Bio (free text, max 500 chars)
  - 3.1.3 Step 3: Verification
    - 3.1.3.1 Health card checkbox (required for food roles)
    - 3.1.3.2 Police clearance checkbox
    - 3.1.3.3 Reference contact (optional)
    - 3.1.3.4 Agent confirms physical Fayda match
  - 3.1.4 On submit
    - 3.1.4.1 Create worker record at Tier 0 (Basic)
    - 3.1.4.2 Optionally create user account (phone OTP login)
    - 3.1.4.3 Worker profile photo uploaded
    - 3.1.4.4 Welcome SMS with station info
    - 3.1.4.5 Audit event `worker.registered`
- 3.2 Tier system
  - 3.2.1 Tier 0 — Basic (default)
    - 3.2.1.1 Requirements: Fayda + phone + photo + interview by agent
  - 3.2.2 Tier 1 — Verified
    - 3.2.2.1 Trigger: reference verified (agent calls reference)
    - 3.2.2.2 Manual upgrade by agent
  - 3.2.3 Tier 2 — Trained
    - 3.2.3.1 Trigger: completed at least one Wez course
    - 3.2.3.2 Auto-upgrade on course completion
  - 3.2.4 Tier 3 — Trusted
    - 3.2.4.1 Trigger: Tier 2 + police clearance + 5+ successful placements + avg rating ≥ 4.5
    - 3.2.4.2 Auto-upgrade once criteria met
    - 3.2.4.3 Re-evaluation on every placement completion
- 3.3 Worker availability
  - 3.3.1 Default: `available = true` until placement
  - 3.3.2 On placement finalize: `available = false`
  - 3.3.3 On placement end: `available = true` after agent reviews
  - 3.3.4 Worker can self-pause via app: "I'm not looking right now"
- 3.4 Worker flags (job-hopping)
  - 3.4.1 None — default
  - 3.4.2 Notice — 2 placements ended within 30 days; visible to agents only
  - 3.4.3 Warning — 3 placements ended within 30 days; visible to employers as "Limited tenure pattern"
  - 3.4.4 Suspended — 4+ placements ended within 30 days OR serious complaint; hidden from search
  - 3.4.5 Auto-applied by background job; admin can manually override
  - 3.4.6 Suspended workers can be reinstated by admin with documented reason
- 3.5 Worker rating
  - 3.5.1 Computed average from placement.rating_by_employer values
  - 3.5.2 Updated when employer rates after placement ends
  - 3.5.3 Stored as denormalized rating_average for fast filtering
- 3.6 Worker browse (agent view) [P1]
  - 3.6.1 "Who are you helping?" picker
    - 3.6.1.1 Search existing employer (autocomplete by name/phone/contact)
    - 3.6.1.2 Register walk-in employer (full)
    - 3.6.1.3 Quick walk-in (no account)
    - 3.6.1.4 Just browsing (no employer)
  - 3.6.2 Filter panel
    - 3.6.2.1 Free-text search (name, bio, area, certs)
    - 3.6.2.2 Specific role
    - 3.6.2.3 Category
    - 3.6.2.4 Worker's woreda
    - 3.6.2.5 Minimum tier
    - 3.6.2.6 Gender
    - 3.6.2.7 Speaks language
    - 3.6.2.8 Religion (with hint about appropriate use)
    - 3.6.2.9 Minimum experience (slider 0-15 years)
    - 3.6.2.10 Max budget (filters by salary range)
    - 3.6.2.11 Has health card
    - 3.6.2.12 Has police clearance
    - 3.6.2.13 Hide flagged workers
    - 3.6.2.14 Sort: rating / tier / experience / placements / newest
  - 3.6.3 Results display
    - 3.6.3.1 Card grid (2 columns desktop)
    - 3.6.3.2 Card shows: photo, name, age/gender/area, badges (tier, flags, certs), top 3 roles, languages, rating, placements count, last 4 of phone
    - 3.6.3.3 Empty state with "clear filters" CTA
    - 3.6.3.4 Active filter count badge
  - 3.6.4 Worker profile modal (presented to employer)
    - 3.6.4.1 Full profile with stats grid
    - 3.6.4.2 Bio, languages, religion (if set)
    - 3.6.4.3 Certificates list
    - 3.6.4.4 Contact info (visible to agent only)
    - 3.6.4.5 Internal warnings (job-hopping flag, employer rating concerns)
    - 3.6.4.6 Action: "Create hire request" (if employer context set)

---

## 4. Employer management [P1]

- 4.1 Employer registration (agent-led)
  - 4.1.1 Type selection: Business or Household
  - 4.1.2 Business fields
    - 4.1.2.1 Business name, contact person, phone, email
    - 4.1.2.2 TIN (validated against ERCA format)
    - 4.1.2.3 Business license number + expiry
    - 4.1.2.4 Area / woreda
    - 4.1.2.5 Optional: business address, type (hotel, restaurant, etc.)
  - 4.1.3 Household fields
    - 4.1.3.1 Full name, phone
    - 4.1.3.2 Fayda (verified against physical card)
    - 4.1.3.3 Area / woreda
    - 4.1.3.4 Optional: secondary contact
  - 4.1.4 Optional user account creation
    - 4.1.4.1 Business: email-based account
    - 4.1.4.2 Household: phone-OTP account
- 4.2 Employer rating (internal, agent-facing only)
  - 4.2.1 Green — good standing (default)
  - 4.2.2 Yellow — minor complaint(s) on file, < 2 unresolved
  - 4.2.3 Orange — multiple complaints, repeat issues
  - 4.2.4 Red — banned, cannot make new hires
  - 4.2.5 Auto-progression based on complaint resolution outcomes
  - 4.2.6 Manual override by admin with documented reason
- 4.3 Employer browse (workers can see employers if logged in) [P2]
  - 4.3.1 Limited employer info visible: name, type, area, placements count
  - 4.3.2 Rating NOT visible to workers
  - 4.3.3 Internal warnings NOT visible to workers (only agent privately advises)
- 4.4 Employer dashboard (logged-in employers) [P2]
  - 4.4.1 Active hires summary
  - 4.4.2 Pending hire requests
  - 4.4.3 Candidate referrals from agents
  - 4.4.4 Open job posts
  - 4.4.5 Quick actions: post job, browse workers, view hires, file complaint

---

## 5. Job postings [P1]

- 5.1 Create job post (employer or agent-on-behalf)
  - 5.1.1 Required: role, title, description, salary range, location
  - 5.1.2 Optional: schedule, requirements, perks
  - 5.1.3 System checks: salary range within configured min/max for role
  - 5.1.4 Status defaults to `open`
- 5.2 Edit job post
  - 5.2.1 Title, description, salary, location editable
  - 5.2.2 Role NOT editable (close and create new)
  - 5.2.3 Edit history retained for audit
- 5.3 Close job post
  - 5.3.1 Manual close by employer/agent
  - 5.3.2 Auto-close on first placement filled (configurable per job)
  - 5.3.3 Auto-close after 90 days of no activity
- 5.4 Job listing display
  - 5.4.1 Public catalog visible to authenticated workers
  - 5.4.2 Filtering: role, category, woreda, employer type, salary, posted within
  - 5.4.3 Sort: newest, salary high, salary low

---

## 6. Hire requests [P1]

- 6.1 Create hire request (employer-initiated, online)
  - 6.1.1 From worker browse: "Request hire" button
  - 6.1.2 Form: role, proposed salary, station, optional note
  - 6.1.3 Validations
    - 6.1.3.1 Worker is available
    - 6.1.3.2 Worker performs the role
    - 6.1.3.3 Salary within role's range
    - 6.1.3.4 Employer not in 'red' rating
  - 6.1.4 On create
    - 6.1.4.1 Status = 'awaiting_visit'
    - 6.1.4.2 Channel = 'online'
    - 6.1.4.3 Expires in 5 days (configurable)
    - 6.1.4.4 SMS to worker with employer name, role, salary
    - 6.1.4.5 In-app notification to assigned station agent
    - 6.1.4.6 Email to employer confirming
- 6.2 Create hire request (agent-initiated, in-station)
  - 6.2.1 From agent's browse-workers, channel = 'in_person'
  - 6.2.2 Same validations
  - 6.2.3 No SMS/email — both parties presumed at desk
- 6.3 Hire request lifecycle
  - 6.3.1 awaiting_visit (default)
  - 6.3.2 completed (placement finalized)
  - 6.3.3 cancelled (employer or worker withdrew)
  - 6.3.4 expired (5 days passed without finalization)
- 6.4 Cancellation
  - 6.4.1 By employer with reason — sends notification to worker
  - 6.4.2 By worker with reason — sends notification to employer
  - 6.4.3 By agent with reason — both parties notified
  - 6.4.4 Cancelled requests stay in history, not deleted
- 6.5 Expiration
  - 6.5.1 Background job runs hourly to mark expired requests
  - 6.5.2 SMS to both parties on expiration
  - 6.5.3 Auto-replaceable with new hire request

---

## 7. Candidate referrals [P1]

- 7.1 Create referral (agent-initiated for a worker on the desk)
  - 7.1.1 Required: worker, employer, job_id (optional), note
  - 7.1.2 Status = 'pending_employer'
  - 7.1.3 Notification to employer (SMS + email + in-app)
- 7.2 Employer reviews referral
  - 7.2.1 Sees worker profile + agent's note
  - 7.2.2 Three actions: accept (creates hire request), decline (with reason), defer
- 7.3 Referral lifecycle
  - 7.3.1 pending_employer
  - 7.3.2 converted (employer created hire request from it)
  - 7.3.3 declined (employer not interested)
  - 7.3.4 expired (no action in 7 days)

---

## 8. Worker interests [P2]

(Workers express interest in jobs digitally; agents call them in.)

- 8.1 Express interest from worker app
  - 8.1.1 Worker taps "I'm interested" on a job
  - 8.1.2 Creates interest record
  - 8.1.3 In-app notification to assigned station agent
- 8.2 Agent follow-up
  - 8.2.1 Sees in agent queue → "Worker interests" tab
  - 8.2.2 Agent calls worker, schedules station visit
  - 8.2.3 At visit: agent creates hire request OR closes interest with reason

---

## 9. Placements (the canonical hire) [P1]

- 9.1 Finalize placement (agent-only, in-station)
  - 9.1.1 Source: from hire request OR fresh creation at desk
  - 9.1.2 Wizard steps
    - 9.1.2.1 Select worker (or auto-loaded from request)
    - 9.1.2.2 Select employer (or auto-loaded)
    - 9.1.2.3 Confirm role & salary
    - 9.1.2.4 Calculate commission (system-configured, no negotiation)
    - 9.1.2.5 Record payment
      - 9.1.2.5.1 Method: Telebirr / CBE Birr / Bank / Cash
      - 9.1.2.5.2 Reference number required
      - 9.1.2.5.3 Cash recorded with double-confirmation
    - 9.1.2.6 Generate agreement PDF
      - 9.1.2.6.1 Bilingual (Amharic + English)
      - 9.1.2.6.2 Includes worker info, employer info, role, salary, commission, terms
      - 9.1.2.6.3 Both parties sign on tablet
      - 9.1.2.6.4 Stored in S3, link in placement record
    - 9.1.2.7 Confirm finalize
      - 9.1.2.7.1 Placement status = 'active'
      - 9.1.2.7.2 Worker available = false
      - 9.1.2.7.3 Hire request (if any) marked completed
      - 9.1.2.7.4 SMS to worker, employer with placement details
      - 9.1.2.7.5 Audit event
- 9.2 Placement lifecycle
  - 9.2.1 active (default)
  - 9.2.2 ended (employer or worker ended; reason required)
  - 9.2.3 disputed (complaint filed during active period)
  - 9.2.4 cancelled (rare — admin action only)
- 9.3 End placement
  - 9.3.1 Initiated by employer or worker (via agent)
  - 9.3.2 End date, end reason captured
  - 9.3.3 Mutual rating prompt (employer rates worker, worker rates employer)
  - 9.3.4 Worker.available = true
  - 9.3.5 Employer.placements_count remains
  - 9.3.6 30-day cool-off before tier auto-recalculation
- 9.4 Rating exchange
  - 9.4.1 Triggered on placement end, rating windows open 30 days
  - 9.4.2 Employer rates worker: 1-5 stars + optional comment
  - 9.4.3 Worker rates employer: 1-5 stars + optional comment (private to admin)
  - 9.4.4 Both ratings averaged into rolling average for the entity
  - 9.4.5 Low ratings (≤2) trigger admin review

---

## 10. Complaints [P1]

- 10.1 File complaint
  - 10.1.1 By worker (in-station at any station, or online)
    - 10.1.1.1 Against an employer they worked for
    - 10.1.1.2 Categories: late wages, unpaid wages, mistreatment, harassment, unsafe conditions, excessive hours, other
    - 10.1.1.3 Severity: low, medium, high
  - 10.1.2 By employer (in-station or online)
    - 10.1.2.1 Against a worker they hired
    - 10.1.2.2 Categories: absences, theft, misconduct, quit without notice, below-skill, other
    - 10.1.2.3 Severity: low, medium, high
- 10.2 Routing logic
  - 10.2.1 High severity (abuse, harassment, major non-payment) → auto-mark `referred_external`, notify Compliance Officer
  - 10.2.2 Medium severity → station agent assigned for mediation
  - 10.2.3 Low severity → station agent for low-touch resolution
- 10.3 Multi-station handling
  - 10.3.1 Complaint can be filed at ANY station regardless of placement origin
  - 10.3.2 Complaint linked to taking-station + placement (placement may be at different station)
  - 10.3.3 Original station's agent CC'd via in-app notification
- 10.4 Complaint lifecycle
  - 10.4.1 open
  - 10.4.2 mediating (agent/HQ working on it)
  - 10.4.3 closed (resolved with outcome captured)
  - 10.4.4 referred_external (passed to MoLS / police / health)
- 10.5 Resolution
  - 10.5.1 Free-text outcome description
  - 10.5.2 Tag: amicable / partial / failed
  - 10.5.3 Effect on parties' ratings
    - 10.5.3.1 Employer with valid complaint: rating step down (green → yellow → orange → red)
    - 10.5.3.2 Worker with valid complaint: hop_flag escalation
- 10.6 External escalation
  - 10.6.1 Compliance Officer reviews referred complaints
  - 10.6.2 Generates referral letter to MoLS / police / health authority
  - 10.6.3 Tracks external case ID

---

## 11. Stations [P1]

- 11.1 Station registry
  - 11.1.1 Name, woreda, address, phone
  - 11.1.2 Active flag
  - 11.1.3 Supervisor (HQ user)
- 11.2 Agent assignments
  - 11.2.1 Many agents per station (typical: 2-4)
  - 11.2.2 An agent can serve multiple stations (rare but allowed for cover)
  - 11.2.3 Schedule (Phase 2): which agent works which days/hours
- 11.3 Station performance metrics
  - 11.3.1 Placements per station per month
  - 11.3.2 Commission revenue per station
  - 11.3.3 Complaints opened/closed per station
  - 11.3.4 Walk-ins handled per station

---

## 12. HQ team & escalation [P1]

- 12.1 HQ org chart (read-only display in Admin)
  - 12.1.1 CEO at top
  - 12.1.2 Functional managers (Ops, Compliance, HR, Finance, IT, Training)
  - 12.1.3 Station Supervisors under Ops Manager
  - 12.1.4 Station Agents under their Supervisor
- 12.2 Internal tickets (escalation system)
  - 12.2.1 Categories with auto-routing
    - 12.2.1.1 system_issue → IT Manager
    - 12.2.1.2 policy_question → Ops Manager
    - 12.2.1.3 compliance_concern → Compliance Officer
    - 12.2.1.4 finance_issue → Finance Manager
    - 12.2.1.5 training_request → Training Manager
    - 12.2.1.6 hr_issue → HR Manager
    - 12.2.1.7 other → Station Supervisor first
  - 12.2.2 Priority: low, medium, high, urgent
  - 12.2.3 Status: open, in_progress, resolved, closed, escalated_higher
  - 12.2.4 Reassignment chain (assignee can reassign)
  - 12.2.5 Resolution required to mark resolved
  - 12.2.6 Notifications: email + in-app to assigned + raiser
- 12.3 Performance reviews [P2]
  - 12.3.1 Quarterly review per agent
  - 12.3.2 Metrics: placements, complaints, ticket-creation rate, accuracy
  - 12.3.3 Manager comments + worker self-eval

---

## 13. Training & certification [P1 in-person, P3 online]

- 13.1 Course catalog
  - 13.1.1 Per-course attributes
    - 13.1.1.1 Name, description, category, mode (online/in_person/hybrid), duration label
    - 13.1.1.2 Fee (cents), unlocked roles, online module count, in-person hours
    - 13.1.1.3 Active flag
  - 13.1.2 Online modules (per course)
    - 13.1.2.1 Title, type (video/reading/quiz), duration in minutes
    - 13.1.2.2 Content stored in S3 or external (YouTube unlisted, Vimeo)
    - 13.1.2.3 Quiz questions stored as JSONB with answers
- 13.2 Course batches (in-person + hybrid)
  - 13.2.1 Per-batch: course_id, instructor_id, start/end date, seats, location
  - 13.2.2 Status: upcoming / in_progress / completed / cancelled
  - 13.2.3 Reservation flow
    - 13.2.3.1 Worker reserves seat in catalog
    - 13.2.3.2 Confirmation SMS + reminder 1 day before start
    - 13.2.3.3 Payment due on first day at HQ
- 13.3 Instructors
  - 13.3.1 Profile: name, expertise, bio, phone
  - 13.3.2 Linked to courses via course.instructor_id (one-to-many)
- 13.4 Enrollment
  - 13.4.1 Worker self-enrolls OR agent enrolls on their behalf
  - 13.4.2 Per-enrollment tracking
    - 13.4.2.1 online_progress_pct (0-100)
    - 13.4.2.2 in_person_attended_hours
    - 13.4.2.3 payment_received flag + reference
    - 13.4.2.4 completed_at + passed flag
    - 13.4.2.5 certificate_issued_at + URL
- 13.5 Online learning experience [P3]
  - 13.5.1 Module navigation: previous / next, progress bar
  - 13.5.2 Video player with playback resume
  - 13.5.3 Reading view with note-taking [L]
  - 13.5.4 Quiz with multiple-choice, scored, 70% to pass
  - 13.5.5 Certificate auto-generated on pass + last module complete
- 13.6 Tier-upgrade integration
  - 13.6.1 Course completion adds certificate to worker.certs[]
  - 13.6.2 First completion → worker.tier 0/1 → 2 (Trained)
  - 13.6.3 Auto-upgrade on completion event
- 13.7 Refunds
  - 13.7.1 No refund after class starts
  - 13.7.2 Partial refund (50%) with documented reason 48h+ before start
  - 13.7.3 Refund tracked as audit event + finance record

---

## 14. Government reports [P1 manual export, P2 templates, P3 API]

- 14.1 Report types
  - 14.1.1 ERCA monthly: tax base, commission revenue, employer payroll summary
  - 14.1.2 MoLS quarterly: placement count, training count, complaint summary
  - 14.1.3 POESSA annual [P3]: pension-eligible workers, employer matches
- 14.2 Report generation
  - 14.2.1 Admin selects period (month, quarter, year)
  - 14.2.2 Background job builds CSV/PDF
  - 14.2.3 Stored in S3, downloadable for 90 days
  - 14.2.4 "Filed" button records manual filing date + reference
- 14.3 Report content
  - 14.3.1 ERCA monthly
    - 14.3.1.1 Total commission birr (taxable income)
    - 14.3.1.2 Total wages flowing through platform
    - 14.3.1.3 Employer count by type
    - 14.3.1.4 Worker count and tier distribution
  - 14.3.2 MoLS quarterly
    - 14.3.2.1 Placements count by role category
    - 14.3.2.2 Workers trained by course
    - 14.3.2.3 Complaints filed, resolved, escalated
    - 14.3.2.4 Compliance attestation (no fees from workers, written agreements, etc.)

---

## 15. Notifications [P1]

- 15.1 Channels
  - 15.1.1 SMS (Afromessage)
  - 15.1.2 Email (Resend)
  - 15.1.3 In-app (badge + dropdown)
  - 15.1.4 Push [P3]
- 15.2 Templates
  - 15.2.1 Each notification type has a template_key
  - 15.2.2 Template stored in DB or i18n file, with variables
  - 15.2.3 Bilingual (Amharic + English) per recipient preference
- 15.3 User preferences
  - 15.3.1 Per-user opt-in/out per channel per category
  - 15.3.2 Cannot opt out of "transactional" (placement confirmations, security alerts)
- 15.4 Delivery tracking
  - 15.4.1 Status: pending / sent / failed / retry
  - 15.4.2 Retry policy: 3 attempts with exponential backoff
  - 15.4.3 Final failure logs to Sentry, recorded in DB
- 15.5 In-app notifications
  - 15.5.1 Badge on bell icon
  - 15.5.2 Click to expand list
  - 15.5.3 Click item to navigate to context
  - 15.5.4 Mark read on click + bulk "mark all read"

---

## 16. Audit logging [P1]

- 16.1 What's audited
  - 16.1.1 All authentication events (login, logout, failed login)
  - 16.1.2 All entity create/update/delete
  - 16.1.3 All state transitions (placement finalize, complaint close)
  - 16.1.4 All admin actions (ban, suspend, role config change)
  - 16.1.5 All sensitive PII accesses [P2 — read-side audit]
- 16.2 Storage
  - 16.2.1 audit_events table, append-only
  - 16.2.2 Indexed by actor, target, action, time
  - 16.2.3 Retained indefinitely (compliance requirement)
- 16.3 Access
  - 16.3.1 Admin-only via UI
  - 16.3.2 Filterable by actor, target, action, date range
  - 16.3.3 Exportable to CSV for compliance audits

---

## 17. Files & documents [P1]

- 17.1 File types
  - 17.1.1 Worker ID photos (encrypted, signed-URL only)
  - 17.1.2 Generated agreement PDFs
  - 17.1.3 Course certificate PDFs
  - 17.1.4 Government report files
  - 17.1.5 Optional: scanned health card, police clearance
- 17.2 Upload flow
  - 17.2.1 Frontend gets pre-signed S3 PUT URL from API
  - 17.2.2 Direct upload to S3
  - 17.2.3 On success, frontend tells API to "finalize" the upload
  - 17.2.4 API verifies file in S3, runs virus scan, marks attachment record valid
- 17.3 Download flow
  - 17.3.1 Authenticated user requests file
  - 17.3.2 API checks permission (e.g., agent of same station, admin, file owner)
  - 17.3.3 API returns short-lived signed URL (5-15 min)
  - 17.3.4 Frontend redirects browser to URL
- 17.4 Retention
  - 17.4.1 Agreement PDFs: 7+ years (compliance)
  - 17.4.2 ID photos: while worker active + 1 year after deletion
  - 17.4.3 Reports: 90 days (regenerable)
  - 17.4.4 Temp uploads: 24 hours

---

## 18. Search [P1 basic, P2 better]

- 18.1 Worker search (agent-facing)
  - 18.1.1 Postgres full-text search on name, bio, certs
  - 18.1.2 Combined with structured filters (see 3.6.2)
- 18.2 Job search
  - 18.2.1 Same FTS approach on title, description
- 18.3 Employer search (agent-facing)
  - 18.3.1 Name, contact, phone autocomplete (3.6.1)
- 18.4 Future: ElasticSearch / Meilisearch [P3] if Postgres FTS hits limits

---

## 19. Analytics dashboards [P1 basic, P3 advanced]

- 19.1 Admin dashboard tiles
  - 19.1.1 Lifetime commission revenue
  - 19.1.2 Wages under management (active placements sum)
  - 19.1.3 Total placements
  - 19.1.4 Workers / employers / open complaints / flagged workers / open tickets / stations
- 19.2 Charts
  - 19.2.1 Top hiring roles bar chart
  - 19.2.2 Stations performance ranked
  - 19.2.3 Worker tier distribution
  - 19.2.4 Placements by category
  - 19.2.5 Gender split
  - 19.2.6 Workers by woreda
- 19.3 Drilldowns [P2]
  - 19.3.1 Click any chart segment → filtered list view
- 19.4 Time-series charts [P3]
  - 19.4.1 Placements per month, last 12 months
  - 19.4.2 Commission per month
  - 19.4.3 Complaints per month, by severity

---

## 20. i18n (Amharic + English) [P1]

- 20.1 Translation file structure
  - 20.1.1 Per-locale JSON files (`am.json`, `en.json`)
  - 20.1.2 Nested keys by feature (`workers.profile.title`)
- 20.2 Frontend usage
  - 20.2.1 react-i18next for components
  - 20.2.2 No hardcoded user-visible strings
- 20.3 Backend
  - 20.3.1 Error messages with `code` field; frontend translates code → text
  - 20.3.2 Email/SMS templates have per-locale versions
- 20.4 PDF generation
  - 20.4.1 Bilingual side-by-side layout
  - 20.4.2 Both Amharic (Ge'ez script) and English on every agreement

---

## 21. Settings (per-user) [P2]

- 21.1 Notification preferences (15.3)
- 21.2 Language preference (Amharic / English)
- 21.3 Profile photo
- 21.4 Sessions list and revocation (1.4.2)
- 21.5 Password change (HQ + business)

---

## 22. Admin: roles & commission config [P1]

- 22.1 List all roles
- 22.2 Edit role attributes
  - 22.2.1 Name, category
  - 22.2.2 Commission type (flat / percent)
  - 22.2.3 Commission value
  - 22.2.4 Salary range min/max
- 22.3 Activate / deactivate role
- 22.4 New roles created via this UI
- 22.5 Changes apply to NEW placements only; existing placements grandfathered

---

## 23. Admin: moderation [P1]

- 23.1 Flagged workers list
  - 23.1.1 Filter by flag type
  - 23.1.2 Suspend / lift suspension actions
  - 23.1.3 View placement history
- 23.2 Flagged employers list
  - 23.2.1 Filter by rating (orange / red)
  - 23.2.2 Ban / lift ban actions
  - 23.2.3 View complaint history

---

## 24. Idempotency [P1]

- 24.1 All POST/PATCH/DELETE endpoints accept Idempotency-Key header
- 24.2 Key + user_id + endpoint hash stored, response cached for 24h
- 24.3 Replay returns cached response, doesn't re-execute
- 24.4 Frontend generates a UUID per submit action

---

## 25. Data export (per-user, GDPR-style) [P2]

- 25.1 User requests own data export
- 25.2 Background job builds JSON + PDFs
- 25.3 Email link to download (24h validity)
- 25.4 Subject to admin approval (manual review for now)

---

## What's NOT a module yet (deliberate)

- Real-time chat between users
- Worker mobile app push notifications (Phase 3)
- Marketplace-style ratings/reviews visible publicly
- Credit/financing of placement fees
- Insurance products
- Multi-tenancy (we are single-tenant, one Wez instance)
- White-label for partners

When a request comes in for any of these, it's a future-phase discussion, not a Phase 1 build.
