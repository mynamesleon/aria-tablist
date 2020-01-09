// core options
const DEFAULT_OPTIONS = {
    // delay in milliseconds before showing tab
    delay: 0,
    // allow tab deletion
    // can be overridden per tab by setting data-deletable="false"
    deletable: false,
    // callbacks
    onOpen: undefined,
    onClose: undefined,
    onReady: undefined
};

// for easy reference
const keys = {
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    delete: 46,
    enter: 13,
    space: 32
};

// add or subtract depending on arrow key pressed
const direction = {
    37: -1,
    38: -1,
    39: 1,
    40: 1
};

// properties used when storing tab index and tablist api on elements
const TAB_INDEX_PROP = '_ariaTablistTabIndex';
const TABLIST_STORAGE_PROP = 'ariaTablist';

// appIndex for id generation
let appIndex = 0;

/**
 * @description helper to prevent default event behaviour
 * @param {Event} event
 */
function preventDefault(event) {
    if (typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
}

/**
 * @description get attribute helper for consistent response
 * @param {Element} element
 * @param {String} attribute
 * @returns {String}
 */
function getAttribute(element, attribute) {
    return (element.getAttribute && element.getAttribute(attribute)) || '';
}

/**
 * @description set attribute helper to handle element existence check
 * @param {Element} element
 * @param {String} attribute
 * @param {String} value
 */
function setAttribute(element, attribute, value) {
    if (element && getAttribute(element, attribute) !== value) {
        element.setAttribute(attribute, value);
    }
}

/**
 * @description Tablist class
 * @param {Element} element
 * @param {Object} options
 */
class Tablist {
    constructor(element, options = {}) {
        if (!element) {
            return;
        }

        // if instance already exists for this element, destroy and re-make
        const storedApi = element[TABLIST_STORAGE_PROP];
        if (storedApi && typeof storedApi.destroy === 'function') {
            storedApi.destroy();
        }

        appIndex += 1;
        this.multiple;
        this.tabTimer;

        this.api = {};
        this.tabs = [];
        this.panels = [];
        this.tablist = element;
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);

        // multiple set in this method so that it can be re-checked when needed
        this.checkMultiple();

        // re-create events for context handling and for removal
        this.keydownEventListener = this.keydownEventListener.bind(this);
        this.clickEventListener = this.clickEventListener.bind(this);
        this.keyupEventListener = this.keyupEventListener.bind(this);

        // store tabs and panels, and set api
        this.generateArrays(true);
        this.generateApi();

        // bind listeners, and set at least one starting tab
        const toActivate = [];
        const time = new Date().getTime();
        this.tabs.forEach((tab, index) => {
            this.addListeners(index);
            const isSelected = getAttribute(tab, 'aria-selected') === 'true';
            if (isSelected && (this.multiple || !toActivate.length)) {
                toActivate.push(tab);
            }
            // force connection between tab and panel
            // use time, appIndex, and tabIndex to ensure unique ids
            const panel = this.panels[index];
            const tabId = `aria-tablist-${time}-${appIndex}-tab-${index}`;
            const panelId = `aria-tablist-${time}-${appIndex}-panel-${index}`;
            if (!tab.id) {
                setAttribute(tab, 'id', tabId);
            }
            if (!panel.id) {
                setAttribute(panel, 'id', panelId);
            }
            setAttribute(tab, 'aria-controls', panel.id);
            setAttribute(panel, 'aria-labelledby', tab.id);
        });

        if (this.tabs.length) {
            // ensure initialisng element has tablist role
            setAttribute(this.tablist, 'role', 'tablist');

            // ensure at least one tab gets activated in single select mode
            if (!this.multiple && !toActivate.length) {
                toActivate.push(this.tabs[0]);
            }

            // activate necessary tabs
            this.deactivateTabs();
            toActivate.forEach(tab => this.activateTab(tab, false));

            // ensure component is focusable, even if nothing is selected
            this.makeFocusable();
        }

        this.triggerOptionCallback('onReady', [this.tablist]);
    }

    /**
     * @description trigger callbacks included in component options
     * @param {String} name
     * @param {Array=} args
     */
    triggerOptionCallback(name, args) {
        if (this.options && typeof this.options[name] === 'function') {
            return this.options[name].apply(this.api, args);
        }
    }

    /**
     * @description get multiple value from tablist element - set on each user interaction
     */
    checkMultiple() {
        this.multiple =
            getAttribute(this.tablist, 'aria-multiselectable') === 'true';
    }

    /**
     * @description ensure the tab list is focusable, even when no tabs are selected
     */
    makeFocusable() {
        for (let i = 0, l = this.tabs.length; i < l; i += 1) {
            if (getAttribute(this.tabs[i], 'tabindex') === '0') {
                return;
            }
        }
        if (this.tabs[0]) {
            setAttribute(this.tabs[0], 'tabindex', '0');
        }
    }

    /**
     * @description get associated tabpanel element
     * @param {Element|Number} element
     * @returns {Element|null}
     */
    getTabPanel(element) {
        const tab = typeof element === 'number' ? this.tabs[element] : element;
        if (tab === null) {
            return null;
        }

        // if an index was used, check current panels array first
        let panel = typeof element === 'number' ? this.panels[element] : null;
        if (panel) {
            return panel;
        }

        // if tab controls an element, search based on that
        const controls = getAttribute(tab, 'aria-controls');
        if (controls) {
            panel = document.getElementById(controls);
        }

        // if still no panel...
        if (!panel) {
            // if tab controlled an element, but was not found, remove that connection
            if (controls) {
                tab.removeAttribute('aria-controls');
            }
            // if the tab has an id, look for a panel based on that
            if (tab.id) {
                panel = document.querySelector(`[aria-labelledby="${tab.id}"]`);
            }
        }

        // if panel exists, set panel role if not already set
        setAttribute(panel, 'role', 'tabpanel');
        return panel;
    }

    /**
     * @description generate tabs and panels arrays - setting element roles if necessary
     * @param {Boolean=} isStartingCheck
     */
    generateArrays(isStartingCheck) {
        this.tabs = [];
        this.panels = [];

        // if no tab role elements found, assume tablist child should be the tabs
        let tabs = this.tablist.querySelectorAll('[role="tab"]');
        if (isStartingCheck && !tabs.length) {
            tabs = this.tablist.childNodes;
        }

        // create tabs and panels arrays
        // only for tabs that control an element, or have a panel labelled by it
        Array.from(tabs).forEach(tab => {
            // do not process non-element nodes
            if (tab.nodeType !== 1) {
                return;
            }

            // ensure tab has an associated panel
            // if no associated panel, remove aria attributes
            const panel = this.getTabPanel(tab);
            if (!panel) {
                tab.removeAttribute('role');
                tab.removeAttribute('tabindex');
                tab.removeAttribute('aria-controls');
                tab.removeAttribute('aria-selected');
                tab.removeAttribute('aria-expanded');
                return;
            }

            // ensure element has the tab role
            setAttribute(tab, 'role', 'tab');

            // store in their respective arrays
            this.tabs.push(tab);
            this.panels.push(panel);

            // store index on the tab itself for arrow keypresses
            tab[TAB_INDEX_PROP] = this.tabs.length - 1;
        });
    }

    /**
     * @description generate api instance
     */
    generateApi() {
        ['tabs', 'panels', 'options', 'destroy'].forEach(prop => {
            this.api[prop] =
                typeof prop === 'function'
                    ? (...args) => this[prop].apply(this, args)
                    : this[prop];
        });

        this.api.open = (...args) => {
            this.checkMultiple();
            this.activateTabWithTimer.apply(this, args);
        };

        this.api.close = (...args) => {
            this.checkMultiple();
            this.deActivateTab.apply(this, args);
        };

        this.api.delete = (...args) => {
            this.checkMultiple();
            this.determineDeletable.apply(this, args);
        };

        // store api on original element
        this.tablist[TABLIST_STORAGE_PROP] = this.api;
    }

    /**
     * @description check if element is in the tabs array
     * @param {Element} element
     * @returns {Boolean}
     */
    elementIsTab(element) {
        for (let i = 0, l = this.tabs.length; i < l; i += 1) {
            if (this.tabs[i] === element) {
                return true;
            }
        }
        return false;
    }

    /**
     * @description add event listeners
     * @param {Number} index
     */
    addListeners(index) {
        this.tabs[index].addEventListener('keydown', this.keydownEventListener);
        this.tabs[index].addEventListener('keyup', this.keyupEventListener);
        this.tabs[index].addEventListener('click', this.clickEventListener);
    }

    /**
     * @description handle click event on tabs
     * @param {Event} event
     */
    clickEventListener(event) {
        let element = event.target;
        preventDefault(event);
        do {
            if (this.elementIsTab(element)) {
                this.checkMultiple();
                return this.activateTabWithTimer(element, false);
            }
            element = element.parentElement || element.parentNode;
        } while (element !== null && element.nodeType === 1);
    }

    /**
     * @description handle keydown on tabs
     * @param {Event} event
     */
    keydownEventListener(event) {
        // ensure keydown event was directly on the tab, in case there are focusable child elements
        if (this.elementIsTab(event.target)) {
            switch (event.keyCode) {
                case keys.end: // activate last tab
                    preventDefault(event);
                    this.focusLastTab();
                    break;
                case keys.home: // activate first tab
                    preventDefault(event);
                    this.focusFirstTab();
                    break;
                case keys.up: // up, down, left, and right are in keydown to prevent page scroll
                case keys.down:
                case keys.left:
                case keys.right:
                    this.determineOrientation(event);
                    break;
            }
        }
    }

    /**
     * @description handle keyup on tabs
     * @param {Event} event
     */
    keyupEventListener(event) {
        // ensure keyup event was directly on the tab, in case there are focusable child elements
        if (this.elementIsTab(event.target)) {
            switch (event.keyCode) {
                case keys.delete:
                    this.determineDeletable(event.target);
                    break;
                case keys.enter:
                case keys.space:
                    this.checkMultiple();
                    this.activateTabWithTimer(event.target);
                    break;
            }
        }
    }

    /**
     * @description determine orientation (horizontal or vertical) focus handling
     * @param {Event} event
     */
    determineOrientation(event) {
        const key = event.keyCode;
        // when a tablist aria-orientation is set to vertical only up and down arrow should function
        // in all other cases only left and right arrows should function
        const proceed =
            getAttribute(this.tablist, 'aria-orientation') === 'vertical'
                ? key === keys.up || key === keys.down
                : key === keys.left || key === keys.right;

        if (proceed) {
            this.switchTabOnArrowPress(event);
        }
    }

    /**
     * @description focus the next, previous, first, or last tab depending on key pressed
     * @param {Event} event
     */
    switchTabOnArrowPress(event) {
        const pressed = event.keyCode;
        if (direction[pressed]) {
            const target = event.target;
            if (typeof target[TAB_INDEX_PROP] === 'number') {
                preventDefault(event);
                if (this.tabs[target[TAB_INDEX_PROP] + direction[pressed]]) {
                    this.tabs[
                        target[TAB_INDEX_PROP] + direction[pressed]
                    ].focus();
                } else if (pressed === keys.left || pressed === keys.up) {
                    this.focusLastTab();
                } else if (pressed === keys.right || pressed == keys.down) {
                    this.focusFirstTab();
                }
            }
        }
    }

    /**
     * @description get tab based on index, or check that element is a tab
     * @param {Element|Number} elem
     * @returns {Element|null}
     */
    getTab(elem) {
        return typeof elem === 'number' && this.elementIsTab(this.tabs[elem])
            ? this.tabs[elem]
            : this.elementIsTab(elem)
            ? elem
            : null;
    }

    /**
     * @description activate any given tab with a delay
     * @param {Element|Number} element
     * @param {Boolean=} setFocus
     */
    activateTabWithTimer(element, setFocus) {
        if (this.tabTimer) {
            clearTimeout(this.tabTimer);
        }

        const delay =
            typeof this.options.delay === 'number' ? this.options.delay : 0;
        this.tabTimer = setTimeout(() => {
            this.activateTab(element, setFocus, delay);
        });
    }

    /**
     * @description activate any given tab panel
     * @param {Element|Number} element
     * @param {Boolean=} setFocus
     */
    activateTab(element, setFocus) {
        const tab = this.getTab(element);
        if (!tab) {
            return;
        }

        // if multiple, and tab is active, deactivate it
        const isSelected = getAttribute(tab, 'aria-selected') === 'true';
        if (this.multiple && isSelected) {
            this.deactivateTab(tab);
            this.makeFocusable();
            return;
        }

        if (!this.multiple) {
            // no need to reactivate the same tab in single-select mode
            if (isSelected) {
                return;
            }
            // deactivate all other tabs
            this.deactivateTabs();
        }

        // make focusable and indicate selected
        setAttribute(tab, 'tabindex', '0');
        setAttribute(tab, 'aria-selected', 'true');

        // set expanded, only on multi-selectable tablists
        if (this.multiple) {
            setAttribute(tab, 'aria-expanded', 'true');
        }

        // remove hidden attribute from tab panel to make it visible
        const panel = this.getTabPanel(element);
        if (panel) {
            panel.removeAttribute('hidden');
            this.triggerOptionCallback('onOpen', [panel]);
        }

        // set focus when required
        if (setFocus !== false) {
            tab.focus();
        }
    }

    /**
     * @description deactivate tab (and hide panel) by its index
     * @param {Element|Number} element
     */
    deactivateTab(element) {
        const tab = this.getTab(element);
        if (!tab) {
            return;
        }

        // only set aria-expanded in multiple mode
        if (this.multiple) {
            setAttribute(tab, 'aria-expanded', 'false');
        }
        setAttribute(tab, 'aria-selected', 'false');
        setAttribute(tab, 'tabindex', '-1');

        const panel = this.getTabPanel(element);
        if (panel && getAttribute(panel, 'hidden') !== 'hidden') {
            setAttribute(panel, 'hidden', 'hidden');
            this.triggerOptionCallback('onClose', [panel]);
        }
    }

    /**
     * @description deactivate all tabs and tab panels
     */
    deactivateTabs() {
        this.tabs.forEach(tab => this.deactivateTab(tab));
    }

    /**
     * @description focus first tab
     */
    focusFirstTab() {
        this.tabs[0] && this.tabs[0].focus();
    }

    /**
     * @description focus last tab
     */
    focusLastTab() {
        const tab = this.tabs[this.tabs.length - 1];
        tab && tab.focus();
    }

    /**
     * @description detect if a tab is deletable
     * @param {Element|Number} element
     */
    determineDeletable(element) {
        const deletable = this.options.deletable;
        if (!deletable) {
            return;
        }
        const tab = this.getTab(element);
        if (getAttribute(tab, 'data-deletable') === 'false') {
            return;
        }

        // delete target tab
        this.deleteTab(tab);

        // update tabs and panels arrays for component
        this.generateArrays();

        // in multiple, move focus to closest tab
        // in single select mode, activate it
        const multiple = this.multiple;
        if (!multiple && getAttribute(tab, 'aria-selected') === 'true') {
            if (tab[TAB_INDEX_PROP] - 1 < 0) {
                this.activateTab(this.tabs[0]);
            } else {
                this.activateTab(this.tabs[tab[TAB_INDEX_PROP] - 1]);
            }
        } else {
            this.switchTabOnArrowPress({
                keyCode: keys.left,
                target: tab
            });
        }

        // if none of the tabs are focusable, set tabindex="0" on first one
        this.makeFocusable();
        this.triggerOptionCallback('onDelete', [tab]);
    }

    /**
     * @description deletes a tab and its panel
     * @param {Element} tab
     */
    deleteTab(tab) {
        const panel = this.getTabPanel(tab);
        tab.parentElement.removeChild(tab);
        if (panel) {
            panel.parentElement.removeChild(panel);
        }
    }

    /**
     * @description destroy component behaviour
     */
    destroy() {
        let i = this.tabs.length;
        while (i--) {
            const tab = this.tabs[i];
            // remove any bound events
            tab.removeEventListener('keydown', this.keydownEventListener);
            tab.removeEventListener('keyup', this.keyupEventListener);
            tab.removeEventListener('click', this.clickEventListener);
            // reset panel attributes
            this.panels[i].removeAttribute('aria-expanded');
            this.panels[i].removeAttribute('hidden');
            this.panels[i].removeAttribute('role');
            // reset tab attributes
            tab.removeAttribute('tabindex');
            tab.removeAttribute('role');
            delete tab[TAB_INDEX_PROP];
        }
        this.tablist.removeAttribute('role');
        // reset element storage
        delete this.tablist[TABLIST_STORAGE_PROP];
        this.tablist = null;
        this.panels = null;
        this.tabs = null;
    }
}

/**
 * @description expose AriaTablist at window level
 * @param {Element} element
 * @param {Object} options
 * @returns {Tablist}
 */
window.AriaTablist = (element, options) => new Tablist(element, options).api;

/**
 * @description AriaTablist class to be exposed
 * @param {Element} element
 * @param {Object} options
 * @returns {Object}
 */
export default class AriaTablist {
    constructor(element, options) {
        this.api = new Tablist(element, options).api;
    }
}
