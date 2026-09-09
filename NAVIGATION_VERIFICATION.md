# Navigation verification

The demo uses `demo/link-fix-proxy.mjs` to add design-neutral navigation behavior without rewriting the homepage markup. `demo/navigation-e2e.mjs` verifies that all 12 demo routes are served through the same navigation proxy and that the homepage contains the expected navigation targets.

Primary buyer flow:
TOP -> video list -> product detail -> checkout -> library -> watch

Role flows:
TOP -> seller demo -> Creator Studio
TOP -> buyer demo -> Library
Login -> Register -> Login
Account -> Orders -> Watch

This is demo navigation coverage; payment, media delivery, authentication, and production integrations remain governed by the existing backend and release-readiness checks.
