# Bookora Master Handoff

## Current status

Latest implemented phase: **Phase 18 — Dashboard & Báo cáo doanh thu**

Overall status: `PENDING`

Phase 18 implementation and automated verification are complete. Dashboard,
Revenue Report, scoped analytics permissions, CSV export, OpenAPI/Orval/Zod and
full regression gates pass. Phase 18 remains `PENDING` because Product Owner
explicitly postponed manual browser/runtime/responsive acceptance. Earlier
manual/live Resend acceptance and Phase 15 VNPAY Sandbox IPN public-HTTPS
evidence also remain open at program level.

## Canonical handoffs

- Phase 18:
  `Bookora_Phase18_Dashboard_Revenue_Report_Handoff.md`
- Phase 18 Super Admin Dashboard Visual Hotfix (`DONE`):
  `Bookora_Phase18_Super_Admin_Dashboard_Visual_Hotfix_Handoff.md`
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

Product Owner can separately run the postponed Phase 18 dashboard/report
browser, responsive and CSV acceptance, plus local Resend acceptance. Continue
to follow the Phase 15 VNPAY resume checklist; do not mark Phase 18 or the
overall Bookora program `DONE` without their remaining evidence.
