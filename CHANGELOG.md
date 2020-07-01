# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2020-07-01

### Added

-   TypeScript definitions added to dist folder for npm module

## [1.2.0] - 2020-01-29

### Added

-   Option to enable all arrow keys to be used when navigating between tabs via the keyboard (instead of detecting the tablist's `aria-orientation` value and enabling left and right arrows by default, and up and down arrows for `vertical` orientation tablists).
-   Option to control the selector that's used when initially looking for tabs, with the default being `[role="tab"]` as before. This is to give the option of not having `role="tab"` elements in the DOM initially that may confuse screen readers if the module fails to load (due to external reasons, such as network issues).
-   Allow use of `data-` attributes: can now use `data-controls` or `data-labelledby` to indicate tab-panel relationships as well as `aria-controls` or `aria-labelledby` attributes, and can use `data-selected="true"` to indicate the starting tab(s) as well as `aria-selected="true"`.
-   Horizontal arrow key reversal when the tablist (or document) is in RTL mode.

### Changed

-   Moved code and build over to TypeScript for: code improvements, self-documentation, and reduced bundle size by using an ES6 output from TypeScript that's bundled to UMD with webpack.

### Fixed

-   Issue where the API's `tabs` and `panels` Arrays were not being updated after a delete action.

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

[1.2.0]: https://github.com/mynamesleon/aria-tablist/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/mynamesleon/aria-tablist/compare/v1.0.0...v1.1.0
