---
name: NDA flow
description: How NDA acknowledgement is collected and stored
---

**Rule:** `ndaAgreed` (boolean) and `ndaAgreedAt` (timestamp) live on `contact_requests`. The investor checks a checkbox in the ListingDetail contact dialog before sending a request. The backend stores `ndaAgreedAt = new Date()` if `ndaAgreed === true`, else null.

**Why:** Timestamped NDA is the legal record. Backend enforces the timestamp — client cannot fake the time.

**How to apply:** The NDA is optional (not required to send contact request), but its presence is recorded. If required NDA is ever enforced, add validation in the `POST /api/listings/:id/contact` route.
