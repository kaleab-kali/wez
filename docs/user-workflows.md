# Wez Platform — User Workflows & Edge Cases

This document walks through every significant workflow from each role's perspective. For each flow: happy path, decision points, and edge cases.

Roles covered: **Worker**, **Employer (Business)**, **Employer (Household)**, **Agent**, **Station Supervisor**, **Admin / HQ Staff**.

---

## Worker workflows

### W1. Worker registration (agent-led, in-station)

**Happy path:**
1. Worker walks into the station
2. Agent greets, asks for Fayda ID
3. Agent opens "Register Worker" wizard, captures identity (step 1)
4. Captures skills, languages, religion (optional), roles, experience (step 2)
5. Captures verification documents (step 3)
6. Submits → worker created at Tier 0, photo uploaded, welcome SMS sent
7. Worker leaves with a printed Wez ID card showing their tier

**Edge cases:**

- *Worker has no Fayda*: Cannot register. Refer them to the kebele office to obtain Fayda first. Do not proceed with workaround IDs.
- *Worker's Fayda already registered*: Show "Existing worker found" with the existing profile. Verify identity match. If same person, just update phone if needed. If different person, escalate to supervisor (possible identity theft).
- *Worker's phone already registered*: Same handling as Fayda duplicate.
- *Worker is under 18*: Block registration (minimum age 18 by Ethiopian labor law for non-light work). Explain politely.
- *Worker doesn't speak any of the supported languages*: At least one language must be selected. If truly none of Amharic/English/Oromiffa/Tigrinya/Arabic, agent uses the closest language and adds note.
- *Worker is illiterate*: Agent reads everything aloud. Worker provides thumbprint instead of signature on agreement.
- *Worker is in a hurry / wants to skip steps*: Don't compromise. Explain that incomplete registration delays placement.
- *Worker doesn't have phone*: Strongly encouraged but not blocking. Use a relative's phone, mark in notes. Worker won't get SMS notifications.
- *Camera/photo capture fails*: Skip and note. Re-capture on next visit. Don't block registration.
- *System down*: Use paper backup form. Manually transcribe when system returns. Document why.

---

### W2. Worker browses jobs (Phase 2+, in worker app)

**Happy path:**
1. Worker logs in via phone OTP
2. Sees dashboard: their tier, recent placements, recommended jobs
3. Taps "Browse jobs"
4. Filters by role / area / salary
5. Taps job → reads details
6. Taps "I'm interested" → creates interest record
7. Receives confirmation: "An agent will contact you within 1 business day"

**Edge cases:**

- *Worker is not available* (currently in placement): Block "I'm interested" with "You currently have an active placement. End it first to apply for new jobs."
- *Worker's tier doesn't match employer's preference*: Job still visible. Filter on browse can hide higher-tier-only jobs.
- *Worker has hop_flag = warning or notice*: Some employers may filter out flagged workers. Don't show those jobs to flagged workers (avoid the disappointment of hidden rejection).
- *Job posted by employer with rating = red*: Don't show. Banned employers can't reach workers.
- *Multiple interests in same job*: Allowed (worker may re-express interest after agent contact). Latest one is the active record.
- *Worker expresses interest then becomes unreachable*: Interest auto-expires after 7 days, agent marks "lost contact" with reason.

---

### W3. Worker enrolls in training

**Happy path (online course):**
1. Worker opens Training tab
2. Filters to "Online" courses
3. Picks course, taps "Enroll online"
4. Enrollment created, payment due notice
5. Worker pays at next station visit (Telebirr to Wez account also works)
6. Once payment received, content unlocks
7. Worker progresses through video → reading → quiz modules
8. Passes quiz → certificate issued, profile updated to Tier 2

**Happy path (in-person batch):**
1. Worker filters to in-person courses
2. Picks course, sees next batch date
3. Taps "Reserve seat"
4. Receives confirmation SMS
5. Day before: reminder SMS
6. Worker shows up at HQ Training Center on start date with payment
7. Attends classes, gets certificate, tier upgraded

**Edge cases:**

- *Course is full*: Show "Waitlist" option. Worker added to waitlist. If seat opens (cancellation), system auto-fills from waitlist.
- *Worker doesn't show up to in-person batch*: After 2 days no-show, enrollment marked "no_show". Refund policy: NO refund (stated at enrollment).
- *Worker pays but quits midway through online course*: Progress saved. Can resume anytime within 90 days. After 90 days, enrollment expires, no refund.
- *Worker can't afford fee upfront*: Phase 2 — installment plan (Wez extends credit, deducted from first placement commission). Phase 1 — must pay upfront.
- *Worker passes quiz but had repeated attempts*: System allows up to 3 quiz attempts. Each attempt logged. Pass on attempt 1-3 issues normal certificate.
- *Worker fails 3 times*: Must wait 14 days before retry, may need to repeat lessons.
- *System glitch loses progress*: Apologize, restore from logs, give them an "I attended" note.

---

### W4. Worker files a complaint

**Happy path:**
1. Worker visits ANY station
2. Tells agent "I have a complaint about my employer"
3. Agent opens Complaint Intake form
4. Captures: against whom, category, severity, description
5. Agent reads back to worker, confirms
6. Submitted → routed to appropriate handler
7. Worker gets receipt-style printout with complaint ID

**Edge cases:**

- *Worker filing at a station different from where placement was made*: Allowed. Original station's agent gets CC'd. Taking station handles intake.
- *Worker reports immediate physical danger*: HIGH severity. Don't try to mediate. Refer to police directly. Compliance Officer notified within 1 hour.
- *Worker reports wage non-payment in vague terms*: Agent presses for specifics: when last paid, how much owed, employer's response. Document everything.
- *Worker complains about previous employer (placement already ended)*: Still accepted. Severity often lower; outcomes affect employer rating retroactively.
- *Worker complains about another worker* (e.g., harassment by colleague): Out of scope — refer to the employer to handle. Document for the record.
- *Worker is angry, hard to extract facts*: Agent listens patiently, takes notes, doesn't try to evaluate truth on the spot. Documentation > judgment.
- *Worker recants later*: Note the recantation in the same complaint record. Don't delete original entry.

---

### W5. Worker ends a placement

**Happy path:**
1. Worker comes to station to formally end placement
2. Agent records end_date and reason (resigned / fired / mutual / contract_ended)
3. Worker rates the employer (1-5 stars, optional comment) — private
4. Worker.available = true after 30-day cool-off recalculation
5. SMS to employer about placement end + their rating prompt

**Edge cases:**

- *Worker just stops showing up to job*: Employer reports it. Agent contacts worker. If unreachable, mark "abandoned" — major hop_flag impact.
- *Worker says they were fired unfairly*: Note their version. Open optional complaint.
- *Worker quits without notice during placement*: Triggers possible flag depending on tenure. Agent privately advises about pattern.
- *Employer ended placement via the platform but worker disagrees on reason*: Worker can dispute via complaint flow. Both versions retained.

---

## Employer workflows

### E1. Business employer registration (in-station, agent-led)

**Happy path:**
1. Employer (typically HR person from a hotel) visits station
2. Agent opens "Register Employer" with Type = Business
3. Captures business name, contact, phone, email
4. Captures TIN, business license number, expiry
5. Captures area
6. Optionally creates a user account for the employer
7. Employer leaves with welcome packet (commission rates, terms, complaint process)

**Edge cases:**

- *Business license expired*: Cannot register. Politely explain. Refer to woreda office for renewal.
- *TIN doesn't validate*: Likely typo. Agent re-checks. If genuinely wrong, employer needs to verify with ERCA.
- *Employer has multiple branches*: One employer record per legal entity. Branches handled via "location" on jobs.
- *Holding company with multiple subsidiaries*: Each legal entity is its own employer (separate TINs). If they want consolidated billing, that's a Phase 3+ feature.
- *Employer wants to register without coming to station*: Phase 2+ self-service portal. Phase 1 — must come.

---

### E2. Household employer registration

**Happy path:**
1. Household employer visits station
2. Agent: Type = Household
3. Captures full name, phone, Fayda
4. Captures area, optional secondary contact
5. Optional user account (phone OTP)

**Edge cases:**

- *Employer doesn't have Fayda*: Required for households. Cannot register. Refer to kebele.
- *Spouse wants to register on behalf of the working partner*: Each is an individual; either can register. If both will employ workers, recommend just one registers as the "household contact."
- *Employer has multiple residences (Addis + Hawassa)*: One profile, multiple addresses. Address-on-placement records the specific work location.

---

### E3. Employer browses workers (Phase 2+, online)

**Happy path:**
1. Logs into employer portal
2. Clicks "Browse workers"
3. Filters by role, area, tier, language
4. Sees worker cards (limited info — no last name, no phone)
5. Clicks worker → sees more detail (still no phone)
6. Clicks "Request hire" → form with role, salary, station, note
7. Submits → hire request created
8. Receives confirmation: "Worker will be contacted; visit Wez station to finalize"

**Edge cases:**

- *Employer in 'red' rating tries to browse*: Browse allowed, but "Request hire" disabled with message: "Account is currently restricted. Please contact your station agent."
- *Employer requests a worker who's already in active placement*: System blocks at submit. "Worker not currently available."
- *Employer requests a worker whose tier doesn't match employer's expectation*: Allowed; warning shown but not blocking.
- *Multiple employers request the same worker simultaneously*: Both requests created. Worker chooses (or agent advises). First-come is NOT first-served.
- *Employer abandons hire request (5 days pass)*: Auto-expire. SMS to both parties.

---

### E4. Employer reviews candidate referral from agent

**Happy path:**
1. Employer dashboard shows "Candidate referred for [job]"
2. Clicks Review
3. Sees worker profile, agent's note
4. Three options: Accept (creates hire request), Decline (with reason), Defer
5. Accepts → fills hire request form → submitted
6. Visits station with worker to finalize

**Edge cases:**

- *Employer feels pressured by agent's note*: They can decline freely. Decline reason captured (training data for agents).
- *Worker isn't quite the right fit but employer doesn't want to be rude*: Defer option lets it sit; auto-declines after 7 days.
- *Employer wants to interview worker before deciding*: Phone interview through agent (agent shares partial worker info). In-person interview at station (they meet in agent's presence).

---

### E5. Employer files complaint about a worker

**Happy path:**
1. Employer visits station OR uses portal (Phase 2)
2. Selects worker (must have placement history with them)
3. Category: absences / theft / misconduct / quit / below-skill / other
4. Severity: low / medium / high
5. Description (free text)
6. Submitted → routes based on severity

**Edge cases:**

- *Employer files retaliation complaint after worker filed against them*: Both complaints stand. Compliance Officer reviews both, looks for pattern.
- *Employer accuses worker of theft*: HIGH severity. Police referral if employer files police report. Worker entitled to defense (agent-mediated session).
- *Employer's complaint is vague ("she's just bad")*: Agent presses for specifics. Vague complaints don't progress to formal status.
- *Employer files multiple petty complaints in short window*: Pattern noted. Employer rating may step toward yellow even if individual complaints don't qualify.

---

## Agent workflows

### A1. Agent's daily flow (start of shift)

**Happy path:**
1. Logs in at station laptop/tablet
2. Sees dashboard: today's bookings, pending hire requests at this station, open complaints
3. Reviews queue tab
4. Greets first walk-in

**Edge cases:**

- *Agent arrives to find unread urgent ticket from supervisor*: Address that first.
- *Internet down*: Use paper forms. Switch to offline mode (Phase 2 feature). Reconcile when online.
- *Agent is sick / late*: Supervisor reassigns to backup agent or temporarily takes over.

---

### A2. Agent handles walk-in worker (looking for jobs)

**Happy path:** see Modules section 3.6 for full flow.

1. Worker walks in, says "I'm looking for work"
2. Agent searches existing worker by phone/Fayda. Found → click. Not found → register (3-step wizard).
3. Once worker context is set, agent goes to "Browse Jobs"
4. Filters with worker-relevant criteria
5. Reviews jobs together with worker
6. For interesting jobs: clicks "Show job to worker" → opens detail
7. If both agree, agent creates "Candidate referral" → employer notified
8. Agent gives worker timeline: "Employer responds usually in 1-2 days"

**Edge cases:**

- *Worker doesn't fit any of the listed jobs (over-qualified or under-qualified)*: Note in worker file. Suggest training. Add to "interested workers" backlog so agent can think later.
- *Worker is shy / doesn't articulate preferences*: Agent uses cards/photos to show options visually. Goes slow.
- *Worker has children with them*: Provide chairs/water. Be patient.
- *Worker walks in drunk*: Politely turn them away, ask them to come back tomorrow.
- *Worker is suspended (hop_flag = suspended)*: Agent can't refer them. Explain reason for suspension and what they need to do (typically wait period or rehab).
- *Worker is in another active placement and asking about new jobs*: Block. "You're currently placed at X. Come back when ready to change."

---

### A3. Agent handles walk-in employer (looking to hire)

**Happy path:**
1. Employer walks in
2. Agent searches existing employer or registers new
3. Once employer context set, opens "Browse Workers"
4. Filters to match employer's needs
5. Shows worker cards to employer (employer can flip through tablet)
6. Employer expresses interest in 1-2 candidates
7. Agent creates hire request OR books interview at station
8. If hire request: schedule station visit with both parties

**Edge cases:**

- *Employer wants to hire someone NOW, today*: Possible if a worker is at station too. Otherwise, agent calls top candidate, schedules ASAP visit.
- *Employer's expectations are unrealistic* ("3 years experience for 4000 birr"): Agent advises gently on market rates. Doesn't shame.
- *Employer wants worker of specific gender / religion / age and reasoning is questionable*: Agent uses judgment. For dietary needs (Muslim household needs Muslim cook for halal), allow. For "I prefer young women," push back, document, escalate if employer insists.
- *Employer rated 'orange'*: Allow them to browse but agent privately warns workers about complaint history.
- *Employer rated 'red'*: Cannot create hire requests at all. Agent explains and refers to admin.

---

### A4. Agent finalizes a placement

**Happy path:**
1. Worker and employer both arrive at station with their hire request reference
2. Agent opens "Make a Placement"
3. If from hire request: clicks "Quick load" — pre-fills everything
4. Verifies worker's Fayda matches profile (visual check)
5. Verifies employer's identity
6. Reviews proposed salary, both parties confirm
7. Agent records payment
   - Payment method: Telebirr / CBE / Bank / Cash
   - Reference number entered (or transaction confirmation shown)
   - For cash: count together with employer, supervisor signs witness slip
8. Generates agreement PDF in both languages
9. Both parties sign on tablet (or thumbprint for illiterate)
10. Worker.available = false
11. Hire request marked completed
12. Welcome SMS to worker with placement details
13. Both parties leave with signed agreement

**Edge cases:**

- *Worker arrives but employer doesn't*: Wait 30 minutes. Then call employer. If can't reach, reschedule. Worker gets transport refund (Phase 2, not Phase 1).
- *Employer arrives but worker doesn't*: Same handling.
- *Both arrive but worker has cold feet*: Agent has private moment with worker, asks questions. If worker truly doesn't want to proceed, cancel hire request, document.
- *Salary disagreement at the desk*: Renegotiate within agent's allowed range. If outside range, escalate to supervisor.
- *Payment fails (Telebirr glitch)*: Don't finalize. Try again. If persistent, switch to CBE or cash. Don't accept "I'll pay tomorrow."
- *Employer wants to negotiate commission down*: Not allowed. Agent stands firm. Refer to admin for true exception cases.
- *Worker can't read agreement*: Agent reads aloud, slowly, in worker's preferred language. Worker can ask questions.
- *Both parties are illiterate*: Thumbprints + agent witness signature.
- *Agreement printer is broken*: Email PDF to both parties, photo of signed tablet screen kept as record. Resend printed version next visit.

---

### A5. Agent submits internal ticket (escalation)

**Happy path:**
1. Agent encounters issue (system bug, policy question, etc.)
2. Opens "Help & Tickets"
3. Picks category (auto-routes to correct HQ person)
4. Title + description + priority
5. Submits → ticket appears for assigned HQ staff
6. HQ responds in resolution textbox; agent sees response in their tickets view

**Edge cases:**

- *Urgent issue (worker safety, fraud)*: Agent calls supervisor directly, not just ticket. Submits ticket too for paper trail.
- *Issue that crosses categories*: Pick the most relevant one. Assignee can reassign internally.
- *Same issue many agents are hitting*: Each files their own ticket so HQ sees the volume. HQ then closes duplicates with reference to the canonical one being addressed.

---

### A6. Agent end-of-day reconciliation

**Happy path:**
1. Sees today's placements list
2. Confirms cash payments match physical cash on hand
3. Reviews open hire requests, calls employers to confirm next-day visits
4. Reviews open complaints, ensures handoff notes are written for tomorrow's agent
5. Submits "End of day" report (auto-generated, agent confirms)

**Edge cases:**

- *Cash mismatch*: STOP. Don't go home. Call supervisor immediately. Recount with witness. Document discrepancy with extreme detail.
- *Open complaints with worker still on premises*: Don't lock the station with them inside. Make sure they leave first or have a supervisor.

---

## Station Supervisor workflows

### S1. Supervisor's daily start

1. Logs in, sees aggregated dashboard for their stations
2. Reviews tickets from their agents
3. Reviews high-severity complaints from yesterday
4. Reviews placements from yesterday — any flagged anomalies?
5. Calls agents to discuss any issues

**Edge cases:**

- *Agent didn't show up*: Cover personally OR reassign from another station.
- *Anomalous placement (very high salary, very low salary)*: Investigate. Possibly fraud or possibly unusual but legitimate.

---

### S2. Supervisor handles escalated ticket

1. Receives reassigned ticket from another HQ staff member ("escalated_higher")
2. Reviews context
3. Decides: handle directly OR re-escalate to Operations Manager
4. Works with agent who raised it
5. Documents resolution

---

### S3. Supervisor approves an exception

Agent comes to supervisor saying "this employer wants commission negotiated down by 10%, they're a major hotel with 50 placements coming."

1. Supervisor reviews business case
2. Either approves (with documented reason and one-time-only flag) OR declines and refers to Operations Manager
3. If approved: temporarily adjusts placement's commission, audit logged with supervisor's user_id

---

## Admin / HQ Staff workflows

### AD1. CEO morning routine

1. Login → Admin dashboard
2. Reviews top stats: revenue, placements, complaints, tickets
3. Drills into any concerning numbers (spike in complaints? drop in placements?)
4. Reviews any "high priority" tickets that haven't been resolved within SLA

---

### AD2. Compliance Officer monthly report cycle

1. End of month approaches
2. Generates ERCA report (one click)
3. Reviews PDF for accuracy
4. Files manually with ERCA office (in-person delivery)
5. Records filing date + reference in admin
6. Generates MoLS quarterly report at end of quarter
7. Same flow

**Edge cases:**

- *Report shows numbers that don't match expectations*: Don't file blindly. Drill in, verify the underlying data. If a real discrepancy, fix in operations (not in the report).
- *Filing rejected by ERCA*: Don't refile until issue understood. May require schema change or data correction, both via formal process.

---

### AD3. HR Manager onboarding new agent

1. New agent hired (HR process)
2. HR creates user account with role = `agent`
3. Assigns to a station (creates agent_assignment)
4. Schedules training: shadow current agent for 1 week, then independent
5. Issues laptop/credentials
6. Books 30-day check-in

---

### AD4. Finance Manager weekly reconciliation

1. Pulls placement payment list for the week
2. Compares to Telebirr / CBE statement
3. Compares to physical cash deposited at bank
4. Investigates any mismatches
5. Reports to Operations Manager + CEO

**Edge cases:**

- *Cash short*: Specific agent's report flagged. Investigate that agent's records.
- *Cash over*: Less concerning but still investigated. Usually a recording error.
- *Telebirr ref number doesn't match Wez merchant statement*: Possible attempted fraud OR provider issue. Flag immediately.

---

### AD5. Admin bans an employer

1. Admin reviews complaint history of an employer
2. Decides 'red' rating warranted
3. Opens employer's record, clicks "Ban"
4. Captures reason, attaches evidence (complaints linked)
5. Submits → employer.rating = 'red', they're notified
6. Their open hire requests cancelled with explanation
7. Their workers in active placements continue, but no new hires

---

### AD6. Admin investigates suspicious pattern

1. Notices: same Fayda registered as worker AND household employer (allowed but unusual)
2. Drills in, sees they hired their own worker (themself?)
3. Audit log shows the agent who registered both
4. Pulls up the agent, reviews their other placements
5. If pattern of suspicious behavior, escalates to CEO + Compliance

---

## Cross-cutting workflows

### X1. End-of-day for the entire system

1. Cron job 23:00 daily:
   - Mark expired hire requests
   - Mark expired interests
   - Recalculate worker hop_flags
   - Generate daily summary email to supervisors
   - Backup database
2. Cron job 23:30 daily:
   - Send next-day reminders for booked placements
   - Send next-day reminders for booked training batches

---

### X2. New month begins

1. Cron job day 1, 00:00:
   - Lock previous month's data (no edits without admin override)
   - Generate ERCA monthly report draft
   - Generate per-employer placement summary (Phase 2 — sent to employers)
2. Compliance Officer reviews ERCA draft, files

---

### X3. Disaster: payment provider outage

1. Telebirr down. Hire requests pile up at station.
2. Agent escalates ticket as `system_issue` (note: not really system, but routing matters).
3. IT Manager confirms outage with provider.
4. Agent given fallback: accept cash, manual receipt with bank deposit slip.
5. Once provider back, reconcile manually.

---

### X4. Disaster: serious abuse complaint

1. Worker comes in distressed, alleges physical abuse by employer
2. Agent: take the report, do NOT pretend to mediate
3. Severity = HIGH, status = referred_external automatically
4. Agent calls supervisor immediately (even if not on shift)
5. Compliance Officer notified within 1 hour
6. Decisions:
   - Worker safety first: offer refuge contacts (shelter, hospital)
   - Employer's other workers: contacted to check welfare
   - Police involvement: encouraged but worker's choice; agent supports either way
   - Employer rating: immediately suspended pending investigation
7. Document everything with timestamps

---

## Ambiguous situations — defaults

When a flow isn't documented or an edge case isn't covered:

- **Worker safety > everything else**
- **Document everything; sort it out later**
- **Don't promise outcomes you can't deliver**
- **When in doubt, escalate. There's no shame in asking a supervisor.**
- **Privacy by default. PII doesn't leave the system without explicit consent.**
- **The agent in front of the user is the trusted authority for that visit. HQ can second-guess later, but the agent's call holds in the moment.**

---

## Final principle

**The system supports the people; people don't serve the system.** Every workflow above optimizes for the human in front of the agent, not for software efficiency. Slow-and-correct beats fast-and-wrong.
