# Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false`).
2. **Verified Authentication Gate**: Every read and write operation requires `request.auth != null && request.auth.token.email_verified == true`. Unverified emails (including spoofed `Aqlanf10@gmail.com` with `email_verified == false`) are strictly rejected.
3. **Master Gate Relational Sync**: Every subcollection document (`cases`, `expenses`, `couriers`) cannot be created, read (`get`), updated, or deleted unless its parent `/workspaces/{userId}` document exists and its `ownerId` matches `request.auth.uid` (or caller is a verified admin). Nested `messages` additionally verify the parent `/workspaces/{userId}/cases/{caseId}` document.
4. **No Blanket List Reads & Zero O(n) List Lookups**: Every `allow list` block strictly checks `resource.data.ownerId == request.auth.uid` (or `isBootstrappedAdmin()`) with zero `get()`/`exists()` calls and zero `isValidId()` on non-existent target doc IDs.
5. **Anti-Update-Gap & Shadow Field Rejection**: Every `create` and `update` calls a standalone `isValid[Entity](incoming())` helper enforcing `hasAll` + `hasOnly` key allowlists, string `.size()` bounds, numeric bounds, regex ID patterns (`^[a-zA-Z0-9_\-]+$`), and bounded array checks.
6. **Action-Based Updates & Terminal State Locking**: Every `update` block wraps `isValid[Entity](incoming())`, locks immortal fields (`ownerId`, `createdAt`), enforces `incoming().updatedAt == request.time`, restricts `affectedKeys().hasOnly(...)` per named action, and prevents non-admin updates once `CloudDentalCase.status == 'Delivered'` or `CloudCourierOrder.status == 'delivered'`.
7. **Privilege Escalation Prevention**: Only `isBootstrappedAdmin()` (`Aqlanf10@gmail.com` with `email_verified == true`) can create or delete `/admins/{adminId}` documents. No user can self-assign admin status.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Shadow Field Injection on Workspace Create**:
   `{ "ownerId": "uid_1", "labName": "Vital", "currency": "SAR", "isSuperAdmin": true, "createdAt": "<SERVER_TIME>", "updatedAt": "<SERVER_TIME>" }` -> `PERMISSION_DENIED` (`hasOnly` rejects `isSuperAdmin`).
2. **Payload 2 — Spoofed Admin Email Without Verification**:
   Auth context `{ uid: "attacker_1", token: { email: "Aqlanf10@gmail.com", email_verified: false } }` reading `/workspaces/victim_1` -> `PERMISSION_DENIED`.
3. **Payload 3 — Self-Assigned Admin Privilege Escalation**:
   Authenticated user `uid_2` writing `{ "uid": "uid_2", "grantedBy": "uid_2", "createdAt": "<SERVER_TIME>" }` to `/admins/uid_2` -> `PERMISSION_DENIED`.
4. **Payload 4 — Orphaned Case Creation Without Parent Workspace**:
   User `uid_3` creating `/workspaces/uid_3/cases/V-101` before `/workspaces/uid_3` exists -> `PERMISSION_DENIED` (Master Gate fails).
5. **Payload 5 — Identity Spoofing (`ownerId` Mismatch)**:
   User `uid_1` creating `/workspaces/uid_1/cases/V-102` with `"ownerId": "victim_99"` -> `PERMISSION_DENIED`.
6. **Payload 6 — ID Poisoning (1.5KB Document ID / Invalid Characters)**:
   User `uid_1` creating `/workspaces/uid_1/cases/bad$id!with spaces` -> `PERMISSION_DENIED` (`isValidId` regex/length guard).
7. **Payload 7 — Denial-of-Wallet Oversized String (`notes` > 1000 chars)**:
   User `uid_1` creating a case with a 50,000-char `notes` string -> `PERMISSION_DENIED`.
8. **Payload 8 — Unbounded / Type-Poisoned Array (`selectedTeeth` with 50 items or string element)**:
   User `uid_1` creating a case with `selectedTeeth: ["tooth1"]` or 40 integers -> `PERMISSION_DENIED`.
9. **Payload 9 — Forged Client Timestamp (`createdAt` != `request.time`)**:
   User `uid_1` creating an expense with `createdAt: Timestamp(2020, 1, 1)` -> `PERMISSION_DENIED`.
10. **Payload 10 — Immortal Field Mutation (`createdAt` or `ownerId` altered on Update)**:
    User `uid_1` updating `/workspaces/uid_1` while mutating `ownerId` -> `PERMISSION_DENIED`.
11. **Payload 11 — Terminal State Bypass (Updating a `Delivered` Case as Non-Admin)**:
    User `uid_1` attempting to change `price` or `status` of a case whose existing `status == 'Delivered'` -> `PERMISSION_DENIED`.
12. **Payload 12 — Cross-Tenant Blanket List Query Scraping**:
    User `uid_1` executing an unfiltered `list` query on `/workspaces/victim_2/cases` -> `PERMISSION_DENIED` (`resource.data.ownerId == request.auth.uid` fails).
