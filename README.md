# Aria Tablist

[![npm version](https://img.shields.io/npm/v/aria-tablist.svg)](http://npm.im/aria-tablist)
[![gzip size](http://img.badgesize.io/https://unpkg.com/aria-tablist/dist/aria-tablist.min.js?compression=gzip)](https://unpkg.com/aria-tablist/dist/aria-tablist.min.js)

Dependency-free plain JavaScript module for WCAG compliant tablists. Also great for accordions.

[Try out the examples](https://mynamesleon.github.io/aria-tablist/examples/)

Key design goals and features are:

-   **multi and single select modes**
-   **horizontal and vertical modes**: Adjusts arrow key usage for moving focus between tabs
-   **progressive enhancement**: Allows for only the tab and panel relationship to be indicated in the DOM, and adds `role` and `aria` attributes automatically as needed
-   **accessibility**: Follows the WCAG spec by default, with options to tweak behaviour
-   **compatibility**: Broad browser and device support (IE9+)
-   **starting states**: Can use `aria-selected="true"` to indicate which tab(s) should be enabled by default.
-   **deletion**: Can enable tab (and panel) deletion using the delete key

## Installation / usage

Grab from NPM and use in a module system:

```
npm install aria-tablist
```

```javascript
import AriaTablist from 'aria-tablist';
new AriaTablist(document.getElementById('tablist'), options);
```

Or grab the minified JavaScript from unpkg:

```html
<script src="https://unpkg.com/aria-tablist"></script>
```

The module relies entirely on standard attributes: it sets the `role` on elements if it needs to, `aria-` attributes for indicating behaviour to screen readers, and relies on setting and removing `hidden="hidden"` to toggle element visibility. This means that you can use all of your own class names and styling, and the module won't override them.

## HTML Requirements / Progressive Enhancement

When the module is called on an element, the following steps are taken:

1. The module will search for `tab` elements using the `tabSelector` option (`'[role="tab"]'` by default).
2. If none are found, all direct children will be processed.
3. For each assumed `tab`, the module will check for a matching `tabpanel` by:
    1. Checking for an `aria-controls` or `data-controls` attribute on the `tab`, and searching for an element with a matching `id`.
    2. If the `tab` has an `id`, searching for an element with an `aria-labelledby` or `data-labelledby` attribute that matches that `id`.
4. For any tabs that were processed where a matching panel was **not** found, if they had `role="tab"` set, the `role` attribute will be removed to prevent confusion to screen reader users.
5. The found tabs and associated panels will then have the relevant `role` and `aria-` attributes set automatically.

This means your HTML only needs to indicate the relationship between the tabs and panels, and the module will handle the rest:

```html
<div id="tabs">
    <div id="tab-1">Panel 1</div>
    <div id="tab-2">Panel 2</div>
    <div id="tab-3">Panel 3</div>
</div>

<div data-labelledby="tab-1">...</div>
<div data-labelledby="tab-2">...</div>
<div data-labelledby="tab-3">...</div>

<script>
    new AriaTablist(document.getElementById('tabs'));
</script>
```

So if you need to cater for users without JavaScript, or if the JavaScript fails to load for whatever reason, there won't be any applicable roles set that would confuse a screen reader user.

You can of course include all of the optimal ARIA attributes straight away if you wish, including indicating which tab should be active by default:

```html
<div id="tabs" role="tablist" aria-label="Fruits">
    <div role="tab" tabindex="-1" aria-controls="panel-1" id="tab-1">
        Apple
    </div>
    <div role="tab" tabindex="0" aria-selected="true" aria-controls="panel-2" id="tab-2">
        Orange
    </div>
    <div role="tab" tabindex="-1" aria-controls="panel-3" id="tab-3">
        Pear
    </div>
</div>

<div role="tabpanel" aria-labelledby="tab-1" hidden="hidden" id="panel-1">...</div>
<div role="tabpanel" aria-labelledby="tab-2" id="panel-2">...</div>
<div role="tabpanel" aria-labelledby="tab-3" hidden="hidden" id="panel-3">...</div>
```

## Options

Most of the functionality is assumed from the included ARIA attributes in your HTML (see the [examples](https://mynamesleon.github.io/aria-tablist/examples/)). The remaining available options and their defaults are:

```javascript
{
    /**
     * delay in milliseconds before showing tab(s) from user interaction
     */
    delay: 0,

    /**
     * allow tab deletion via the keyboard - can be overridden per tab by setting `data-deletable="false"`
     */
    deletable: false,

    /**
     * make all tabs focusable in the page's tabbing order (by setting a `tabindex` on them), instead of just 1
     */
    focusableTabs: false,

    /**
     * make all tab panels focusable in the page's tabbing order (by setting a `tabindex` on them)
     */
    focusablePanels: true,

    /**
     * activate a tab when it receives focus from using the arrow keys
     */
    arrowActivation: false,

    /**
     * enable all arrow keys for moving focus, instead of horizontal or vertical arrows based on `aria-orientation` attribute
     * (left and up for previous, right and down for next)
     */
    allArrows: false,

    /**
     * the selector to use when initially searching for tab elements;
     * if none are found, all direct children of the main element will be processed
     */
    tabSelector: '[role="tab"]',

    /**
     * value to use when setting tabs or panels to be part of the page's tabbing order
     */
    tabindex: 0,

    /**
     * callback each time a tab opens
     */
    onOpen: (panel, tab) => {},

    /**
     * callback each time a tab closes
     */
    onClose: (panel, tab) => {},

    /**
     * callback when a tab is deleted
     */
    onDelete: (tab) => {},

    /**
     * callback once ready
     */
    onReady: (tablist) => {}
}
```

All component options that accept a Function will have their context (`this`) set to include the full autocomplete API (assuming you use a normal `function: () {}` declaration for the callbacks instead of arrow functions).

## API

The returned `AriaTablist` class instance exposes the following API (which is also available on the original element's `ariaTablist` property):

```typescript
{
    /**
     * the tab elements the module currently recognises
     */
    tabs: HTMLElement[];

    /**
     * the panel elements the module currently recognises
     */
    panels: HTMLElement[];

    /**
     * the current options object
     */
    options: AriaTablistOptions | Object;

    /**
     * trigger a particular tab to open (even if disabled)
     */
    open(index: number | HTMLElement, focusTab: Boolean = true): void;

    /**
     * trigger a particular tab to close (even if disabled)
     */
    close(index: number | HTMLElement, focusTab: Boolean = false): void;

    /**
     * delete a particular tab and its corresponding panel (if deletable)
     */
    delete(index: number | HTMLElement): void;

    /**
     * destroy the module - does not remove the elements from the DOM
     */
    destroy(): void;
}
```
