# Bookora Master Handoff

## Current status

Latest implemented phase: **Phase 17 — Wishlist, Reviews & Account Dashboard**

Overall status: `PENDING`

Phase 17 source, forward migration, generated OpenAPI/Orval/Zod and automated
gates are implemented. Overall status remains pending because Phase 17 manual
browser F5/cross-tab/six-viewport acceptance was skipped by user instruction.
The earlier Phase 15 VNPAY Sandbox IPN public-HTTPS evidence also remains open.

## Canonical handoffs

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

Run the Phase 17 manual matrix in its handoff, then follow the Phase 15 VNPAY
resume checklist. Do not mark the overall Bookora program `DONE` until both
manual runtime evidence and true VNPAY Sandbox IPN evidence are available.
