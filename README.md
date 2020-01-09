# Aria Tablist

[![npm version](https://img.shields.io/npm/v/aria-tablist.svg)](http://npm.im/aria-tablist)
[![gzip size](http://img.badgesize.io/https://unpkg.com/aria-tablist/dist/aria-tablist.min.js?compression=gzip)](https://unpkg.com/aria-tablist/dist/aria-tablist.min.js)

Dependency-free plain JavaScript module for WCAG compliant tablists

[Try out the examples](https://mynamesleon.github.io/aria-tablist/examples/)

## Installation / usage

Grab from NPM and use in a module system:

```
npm install aria-autocomplete
```

```javascript
import AriaTablist from 'aria-tablist';
new AriaTablist(document.getElementById('tablist'));
```

Or grab the minified JavaScript from unpkg:

```html
<script src="https://unpkg.com/aria-tablist/dist/aria-tablist.min.js"></script>
```

## Options

Most of the functionality is assumed from the included ARIA attributes in your HTML (see the [examples](https://mynamesleon.github.io/aria-tablist/examples/)), but some basic options are also available:

```javascript
{
    /**
     * @description delay in milliseconds before showing tab(s) from user interaction
     */
    delay: 0,

    /**
     * @description allow tab deletion - can be overridden per tab by setting data-deletable="false"
     */
    deletable: false,

    /**
     * @description callback each time a tab opens
     */
    onOpen: (panel) => {},

    /**
     * @description callback each time a tab closes
     */
    onClose: (panel) => {},

    /**
     * @description callback once ready
     */
    onReady: (tablist) => {}
};
```
