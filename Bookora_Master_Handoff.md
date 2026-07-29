# Bookora Master Handoff

## Current status

Latest implemented phase: **Phase 17.5 — TTL Audit & E2E Baseline Hotfix**

Overall status: `PENDING`

Phase 17.5 and its CSRF/email-status/TTL/E2E baseline hotfixes are `DONE`.
Password-reset TTL is configurable by a positive-integer env value, and full
backend E2E now passes 9/9 suites, 55/55 tests while preserving SUPER_ADMIN
Order read-only policy. Overall status remains pending because manual
browser/live Resend acceptance was intentionally not run and the earlier
Phase 15 VNPAY Sandbox IPN public-HTTPS evidence remains open.

## Canonical handoffs

- Phase 17.5 TTL/E2E baseline hotfix:
  `Bookora_Phase17_5_TTL_And_E2E_Baseline_Hotfix_Handoff.md`
- Phase 17.5 CSRF/email-status hotfix:
  `Bookora_Phase17_5_CSRF_After_Reset_And_Email_Status_Hotfix_Handoff.md`
- Mini Phase 17.5:
  `Bookora_Phase17_5_Customer_Mail_Forgot_Password_Handoff.md`
- Phase 17: `Bookora_Phase17_Wishlist_Reviews_Account_Dashboard_Handoff.md`
- Phase 16 Customer Receipt List UX hotfix:
  `Bookora_Phase16_Customer_Receipt_List_UX_Hotfix_Handoff.md`
- Phase 16 Customer Receipt/Focus Refetch hotfix:
  `Bookora_Phase16_Customer_Receipt_Focus_Refetch_Hotfix_Handoff.md`
- Phase 16: `Bookora_Phase16_Admin_Order_Management_Handoff.md`
- Phase 15: `Bookora_Phase15_Checkout_Orders_Handoff.md`
- Phase 13: `Bookora_Phase13_Cart_Handoff.md`
- Phase 12: `Bookora_Phase12_Public_Product_Catalog_Handoff.md`
- Mini Phase 11.5:
  `Bookora_Mini_Phase11_5_Customer_Account_Foundation_Handoff.md`
- Backend Phase 11:
  `D:\CTU\CT466E\bookora-api\bookora-api\Bookora_Phase11_Context_Handoff.md`

## Active repositories

- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`
- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`

## Phase dependencies

- Phase 14 coupon/discount module was not present at Phase 15 preflight.
  Checkout therefore keeps discounts at zero and contains no invented coupon
  API or stacking rules.
- GHN, VietMap, and VNPAY credentials remain backend-only.
- Checkout uses server-owned drafts and immutable order snapshots; the
  frontend never computes authoritative shipping fees or payment success.
- Phase 16 reuses Phase 15 lifecycle and inventory semantics; it adds no refund
  workflow for paid VNPAY orders.

## Next action

Product Owner can separately run local Resend/browser acceptance. Continue to
follow the Phase 15 VNPAY resume checklist; do not mark the overall Bookora
program `DONE` without true VNPAY Sandbox IPN evidence.
