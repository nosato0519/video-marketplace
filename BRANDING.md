# Customer Branding

The production app has a single customer-facing brand setting in `app/index.html`:

```html
<meta name="video-marketplace-brand" content="VIDEO MARKETPLACE">
```

Change the `content` value to the customer's brand name. `app/branding.js` applies that value to dynamically rendered UI, replacing both the legacy `VIDORA` placeholder and the default `VIDEO MARKETPLACE` label when they appear in the application shell.

## Customer hand-off

1. Set the brand name in `app/index.html`.
2. Replace the customer's logo/assets where applicable.
3. Replace customer support/contact information.
4. Replace the demo legal/privacy text with the customer's actual policies and operator information.
5. Run the complete automated regression suite before delivery.

This setting does not configure payment credentials, database credentials, storage, authentication secrets, or legal compliance. Those remain deployment-specific production configuration.
