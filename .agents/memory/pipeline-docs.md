---
name: Pipeline and document vault
description: Pipeline stage transitions and document upload flow
---

**Pipeline:** `POST /api/pipeline` is idempotent — returns existing entry if investor already has this listing tracked. Stage advance via `PATCH /api/pipeline/:id/stage`. Activity log is an append-only JSON array on the row. `successFeePrompted` ("yes"/"no") is stored on the pipeline row when a deal closes.

**Document upload flow (presigned):**
1. Frontend POSTs to `/api/storage/uploads/request-url` → gets `{uploadURL, objectPath}`
2. Frontend PUTs file directly to `uploadURL`
3. Frontend POSTs to `/api/deals/private/:id/documents` with `{objectPath, fileName, fileSize, documentType}`
4. Backend inserts into `document_vault` table and re-computes quality score

**Why:** Direct-to-storage upload avoids buffering large files through the API server. Object path is stable after registration.

**How to apply:** Storage route is unauthenticated for the presigned URL request. Document registration endpoint enforces ownership. Any new doc types must be added to both the frontend `DOC_TYPE_LABELS` map and the Zod enum in the route.
