# Bookora Master Handoff

## Current status

Latest implemented phase: **Phase 16 — Customer Receipt List UX Hotfix**

Overall status: `PENDING`

Phase 16 and its Customer Receipt/List UX/Focus Refetch hotfix source implementation and automated gates are complete. Overall status
remains pending because Phase 15 manual browser/runtime acceptance was skipped
by user instruction and a true VNPAY Sandbox IPN E2E needs an approved public
HTTPS callback endpoint.

## Canonical handoffs

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

Phase 16 needs no further source work. Follow the Phase 15 resume checklist and
do not mark the overall Bookora program `DONE` until manual runtime and true
VNPAY Sandbox IPN evidence are available.
