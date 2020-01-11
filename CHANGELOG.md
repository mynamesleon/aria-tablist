# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2020-01-11

### Added

-   Option to have all `tab` elements in the normal tabbing order, instead of just one.
-   Option to ensure `tabpanel` elements are in the normal tabbing order.
-   Option to automatically activate/deactivate tabs when moving focus between them using the arrow keys.
-   Option to control the `tabindex` value that's added to `tab` and `tabpanel` elements, to account for custom tabbing orders on a page.
-   Prevent `tab` activation or de-activation if it has `aria-disabled="true"` set (the API's `open` and `close` methods deliberately ignore this).
-   Setting `aria-hidden="true"` as well as `hidden="hidden"` when hiding a `tabpanel`.

### Changed

-   Set `aria-expanded="true"` on the active `tab` and `tabpanel` elements, instead of just the `tab`. This was originally being set on just the `tab` because NVDA wasn't announcing it on the `tabpanel`, however the WCAG spec does specifically indicate setting it on the `tabpanel`. This change should be a good compromise to be announced by NVDA, whilst also being compliant with the WCAG spec.
-   When initialising, and an associated panel is not found for a `tab`, the `role` attribute will be removed if the element has `role="tab"` set. Previously the `role`, `tabindex`, `aria-controls`, `aria-selected`, and `aria-expanded` attributes were all being removed from it regardless, but that risked breaking other functionality on the page unrelated to the tablist. This change should be sufficient to prevent screen reader confusion related to the tablist, without affecting any other page functionality reliant on the processed element(s).

### Fixed

-   Issue where no tabs were focusable after using the API to programmatically close them all.
-   Issue where, when deleting the first `tab`, page focus was moved to the last `tab`.
