# HerbWorld Share Launch Status

Date: 2026-06-12

## Production status

- Production URL: https://herbworld.app
- Hosting: Vercel production deployment
- Database: Neon PostgreSQL
- Initial operating scope: Manhattan free reusable-item pilot
- Public publishing, claiming, service requests, reports, and handoff verification are live.
- Operations and operations API are protected by production authentication.

## Verified in production

- Production build, TypeScript, and ESLint pass.
- `/api/health` returns HTTP 200 and confirms database connectivity.
- Unauthenticated `/api/community/operations` access returns HTTP 401.
- Security headers include HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, and cross-origin opener policy.
- Full publish flow passed: submit item, approve after safety checks, verify public listing, remove test listing.
- Full handoff flow passed: submit item, approve, submit claim, issue expiring one-time handoff code, complete handoff, verify final states, remove test listing.
- Production uses separate `HANDOFF_CODE_SECRET` and `COMMUNITY_ID_SECRET` values.
- Administrative community status changes are written to `community_audit_logs`.

## Current launch boundaries

- Items are free only.
- Manhattan pilot only.
- Every public item requires manual approval.
- No platform payments, deposits, escrow, donations, insurance, cash rewards, or user-to-user sales.
- Paid services are separately quoted and performed by verified independent businesses.
- Public listings do not expose original contact information or full addresses.

## External items that do not block the website pilot

- Confirm and record the USPTO trademark application serial number after the paid filing.
- Complete Apple Developer organization enrollment and D-U-N-S verification before App Store submission.
- Obtain New York attorney or CPA advice on foreign LLC authority before enabling paid New York operations.
- Obtain formal insurance quotes before expanding paid referrals or institutional projects.
- Recruit and verify the first service-business partners.

## Immediate operating target

Complete the first 15 supervised real handoffs, record incidents and operator minutes, and validate at least two paid service referrals before expanding product scope.
