# UX Polish V1

## Quality bar
Every user-facing flow must be understandable without developer knowledge and must remain coherent across desktop and mobile.

## Product detail
- Clear media preview and product identity above the fold.
- Price, currency, access/delivery type and key terms are visible before checkout.
- Primary action has one obvious purpose.
- Seller identity and trust information are easy to find.
- Loading, unavailable and error states are designed, not browser defaults.

## Checkout
- Minimal steps.
- Currency and total are explicit.
- No surprise fees.
- Preserve entered state when recoverable.
- Prevent double-submit.
- Provide a useful confirmation and explain what happens next.

## Seller dashboard
- Show the next action prominently.
- Upload progress is persistent and recoverable.
- Validation errors identify the exact field and how to fix it.
- Draft, review, published, rejected and suspended states are visually distinct.

## Admin dashboard
- Prioritize action-required work.
- Destructive actions require deliberate confirmation.
- Empty states explain how to get started.
- Tables become cards on small screens.
- No critical operation depends on hover.

## Accessibility
- Keyboard navigation for core flows.
- Visible focus states.
- Semantic labels for controls and forms.
- Error messages associated with fields.
- Sufficient contrast and scalable text.
- Respect reduced-motion preferences.

## Internationalization
- Avoid hard-coded text in UI components.
- Layouts must tolerate longer translations.
- Dates, numbers and currencies use locale-aware formatting.
- Right-to-left support remains possible in the design system.

## Performance
- Lazy-load heavy media and non-critical UI.
- Use responsive images.
- Avoid blocking the initial page on unnecessary third-party scripts.
- Show intentional loading states rather than frozen screens.

## Final rule
Do not call a screen finished because it looks good in one screenshot. Test its keyboard, mobile, loading, empty, error, long-text and permission-denied states as well.
