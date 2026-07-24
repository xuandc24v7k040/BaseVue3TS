# Bookora Master Handoff

## Current status

Latest implemented phase: **Phase 15 — Checkout & Orders**

Overall status: `PENDING`

The source implementation and automated gates are complete. Phase 15 remains
pending only because manual browser/runtime verification was skipped by user
instruction and a true VNPAY Sandbox IPN E2E needs an approved public HTTPS
callback endpoint.

## Canonical handoffs

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

## Next action

Follow the Phase 15 resume checklist. Do not mark the phase `DONE` until manual
runtime and true VNPAY Sandbox IPN evidence are available.

