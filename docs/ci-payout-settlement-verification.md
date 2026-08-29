# Payout settlement CI verification

This checkpoint intentionally triggers the backend regression workflow from the current `main` state so the PostgreSQL payout allocation locking fix and existing full/partial/cancelled payout acceptance coverage are verified together.

The functional fix under verification is commit `36ad9257a3400566f655dcfe13d270fa885a7d36`.

This file contains no runtime or financial logic.
