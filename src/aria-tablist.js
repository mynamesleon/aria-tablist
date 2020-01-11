// core options
const DEFAULT_OPTIONS = {
    /**
     * @description delay in milliseconds before showing tab(s) from user interaction
     */
    delay: 0,

    /**
     * @description allow tab deletion - can be overridden per tab by setting data-deletable="false"
     */
    deletable: false,

    /**
     * @description make all tabs focusable in the normal tabbing order (by setting tabindex="0" on them), instead of just 1
     */
    focusableTabs: false,

    /**
     * @description make all panels focusable (by setting tabindex="0" on them)
     */
    focusablePanels: true,

    /**
     * @description activate a tab when it receives focus from using the arrow keys
     */
    arrowActivation: false,

    /**
     * @description value to use when setting tabs or panels to be part of the page's tabbing order
     */
    tabindex: 0,

    /**
     * @description callback each time a tab opens
     * @type {Function}
     */
    onOpen: undefined,

    /**
     * @description callback each time a tab closes
     * @type {Function}
     */
    onClose: undefined,

    /**
     * @description callback when a tab is deleted
     * @type {Function}
     */
    onDelete: undefined,

    /**
     * @description callback once ready
     * @type {Function}
     */
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
 * @description helper to remove attribute(s) from element
 * @param {Element} element
 * @param {String} attr - space delimitted for multiple
 */
function removeAttribute(element, attr) {
    if (element && attr) {
        for (let i = 0, a = attr.split(' '), l = a.length; i < l; i += 1) {
            a[i] && element.removeAttribute(a[i]);
        }
    }
}

/**
 * @description create a Tablist
 * @param {Element} element
 * @param {Object} [options={}]
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
        this.options = {};
        this.tablist = element;

        // set options and start
        const defaults = DEFAULT_OPTIONS;
        for (let i in defaults) {
            const hasOption = typeof options[i] !== 'undefined';
            this.options[i] = hasOption ? options[i] : defaults[i];
        }
        this.init();
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
     * @description get multiple value from tablist element
     * has own method to be re-checked on each user interaction
     */
    checkMultiple() {
        this.multiple =
            getAttribute(this.tablist, 'aria-multiselectable') === 'true';
    }

    /**
     * @description ensure the tab list is focusable, even when no tabs are selected
     */
    makeFocusable() {
        // use normal loop instead of forEach so that we only process as many as we need to
        const tabindex = `${this.options.tabindex}` || '0';
        for (let i = 0, l = this.tabs.length; i < l; i += 1) {
            if (getAttribute(this.tabs[i], 'tabindex') === tabindex) {
                return;
            }
        }
        // default to setting first tab to be focusable, to match radio button behaviour
        if (this.tabs[0]) {
            setAttribute(this.tabs[0], 'tabindex', tabindex);
        }
    }

    /**
     * @description set needed starting aria attributes for wcag
     * @param {Element} tab
     * @param {Number} index
     */
    setTabStartingAttributes(tab, index) {
        const panel = this.panels[index];
        // ensure panels are in the normal tabbing order
        // do not need to set for tabs here - this is done in deactivateTabs method
        if (this.options.focusablePanels) {
            setAttribute(panel, 'tabindex', this.options.tabindex || '0');
        }
        // set ids generated from app index and tab index if needed
        if (!tab.id) {
            const tabId = `aria-tablist-${appIndex}-tab-${index}`;
            setAttribute(tab, 'id', tabId);
        }
        if (!panel.id) {
            const panelId = `aria-tablist-${appIndex}-panel-${index}`;
            setAttribute(panel, 'id', panelId);
        }
        // ensure connection between tab and panel
        setAttribute(tab, 'aria-controls', panel.id);
        setAttribute(panel, 'aria-labelledby', tab.id);
    }

    /**
     * @description get associated tabpanel element
     * @param {Element|Number} element
     * @returns {Element|null}
     */
    getTabPanel(element) {
        const tab = typeof element === 'number' ? this.tabs[element] : element;
        // ensure tab is an element
        if (tab === null || tab.nodeType !== 1) {
            return null;
        }

        // if an index was used, check panels array for a match first
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
                removeAttribute(tab, 'aria-controls');
            }
            // if the tab has an id, look for a panel based on that
            if (tab.id) {
                panel = document.querySelector(`[aria-labelledby="${tab.id}"]`);
            }
        }
        return panel;
    }

    /**
     * @description generate tabs and panels arrays - setting element roles if necessary
     * @param {Boolean=} isStartingCheck
     */
    generateArrays(isStartingCheck) {
        this.tabs = [];
        this.panels = [];

        // if no tab role elements found, assume tablist children could be the tabs
        let tabs = this.tablist.querySelectorAll('[role="tab"]');
        if (isStartingCheck && !tabs.length) {
            tabs = this.tablist.childNodes;
        }

        // create tabs and panels arrays
        // only for tabs that control an element, or have a panel labelled by it
        for (let i = 0, l = tabs.length; i < l; i += 1) {
            const tab = tabs[i];
            // do not process non-element nodes - also check against panels Array
            // (when processing childNodes, tabs and panels could be siblings)
            if (!tab || tab.nodeType !== 1 || this.panels.indexOf(tab) > -1) {
                continue;
            }

            // ensure tab has an associated panel
            // if not, and the element had the `tab` role, remove it to prevent confusion
            const panel = this.getTabPanel(tab);
            if (!panel) {
                if (getAttribute(tab, 'role') === 'tab') {
                    removeAttribute(tab, 'role');
                }
                continue;
            }

            // ensure tab and panel have needed roles
            setAttribute(tab, 'role', 'tab');
            setAttribute(panel, 'role', 'tabpanel');

            // store in their respective arrays
            this.tabs.push(tab);
            this.panels.push(panel);

            // store index on the tab itself for arrow keypresses
            tab[TAB_INDEX_PROP] = this.tabs.length - 1;
        }
    }

    /**
     * @description generate api instance
     */
    generateApi() {
        ['tabs', 'panels', 'options'].forEach(prop => {
            this.api[prop] = this[prop];
        });

        this.api.destroy = () => this.destroy.call(this);
        this.api.delete = index => {
            this.checkMultiple();
            this.determineDeletable.call(this, index);
        };
        // have open and close methods always set force param to true
        // to ensure attributes are all updated correctly
        this.api.open = (index, setFocus) => {
            this.checkMultiple();
            this.activateTabWithTimer.apply(this, [index, setFocus, true]);
        };
        this.api.close = (index, setFocus) => {
            this.checkMultiple();
            this.deactivateTab.apply(this, [index, setFocus, true]);
            this.makeFocusable();
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
        return !!(element && this.tabs.indexOf(element) > -1);
    }

    /**
     * @description bind events listeners
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
                case keys.space:
                case keys.enter:
                    preventDefault(event);
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
                    preventDefault(event);
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
                const toFocus = target[TAB_INDEX_PROP] + direction[pressed];
                if (this.tabs[toFocus]) {
                    this.focusTab(toFocus);
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
     * @param {Boolean=} force
     */
    activateTabWithTimer(element, setFocus, force) {
        if (this.tabTimer) {
            clearTimeout(this.tabTimer);
        }

        const delay =
            typeof this.options.delay === 'number' ? this.options.delay : 0;
        this.tabTimer = setTimeout(() => {
            this.activateTab(element, setFocus, force);
        }, delay);
    }

    /**
     * @description activate any given tab panel
     * @param {Element|Number} element
     * @param {Boolean} [setFocus=true]
     * @param {Boolean} [force=false]
     */
    activateTab(element, setFocus = true, force = false) {
        const tab = this.getTab(element);

        // set focus before opening and before disabled check
        // for arrow navigation and event order
        if (tab && setFocus) {
            tab.focus();
        }

        if (!tab || (!force && getAttribute(tab, 'aria-disabled') === 'true')) {
            return;
        }

        // if multiple mode, and tab is active, deactivate it
        // unless being force set to open
        const isSelected = getAttribute(tab, 'aria-selected') === 'true';
        if (this.multiple && isSelected && !force) {
            this.deactivateTab(tab);
            this.makeFocusable();
            return;
        }

        // force deactivate all other tabs (including disabled ones) in single select mode
        if (!this.multiple) {
            this.deactivateTabs([tab]);
        }

        // make focusable and indicate selected
        const tabindex = this.options.tabindex || '0';
        setAttribute(tab, 'tabindex', tabindex);
        setAttribute(tab, 'aria-selected', 'true');

        // remove hidden attribute from tab panel to make it visible
        const panel = this.getTabPanel(element);
        if (panel) {
            removeAttribute(panel, 'hidden aria-hidden');
            // set expanded, only on multi-selectable tablists
            if (this.multiple) {
                setAttribute(panel, 'aria-expanded', 'true');
                setAttribute(tab, 'aria-expanded', 'true');
            }
            // ensure panel is in the normal tabbing order
            if (this.options.focusablePanels) {
                setAttribute(panel, 'tabindex', tabindex);
            }
            if (!isSelected) {
                this.triggerOptionCallback('onOpen', [panel, tab]);
            }
        }
    }

    /**
     * @description deactivate tab (and hide panel) by its index
     * @param {Element|Number} element
     * @param {Boolean} [setFocus=false]
     * @param {Boolean} [force=false]
     */
    deactivateTab(element, setFocus = false, force = false) {
        const tab = this.getTab(element);
        if (!tab) {
            return;
        }

        // set focus before closing, for event order
        if (setFocus) {
            tab.focus();
        }

        // ensure tabindex gets set even when disabled, for programmatic focusing
        // and in case options change between activations
        const focusableTabs = this.options.focusableTabs;
        const tabindex = focusableTabs ? this.options.tabindex || '0' : '-1';
        setAttribute(tab, 'tabindex', tabindex);

        // allow force closing (used on other tabs in single-select mode)
        if (!force && getAttribute(tab, 'aria-disabled') === 'true') {
            return;
        }

        setAttribute(tab, 'aria-selected', 'false');
        const panel = this.getTabPanel(element);
        if (panel) {
            // store if it was hidden, to determine if callback should fire
            const wasHidden = getAttribute(panel, 'hidden') === 'hidden';
            // now do the hiding
            removeAttribute(panel, 'tabindex');
            setAttribute(panel, 'hidden', 'hidden');
            setAttribute(panel, 'aria-hidden', 'true');
            // set aria-expanded in multiple mode
            if (this.multiple) {
                setAttribute(tab, 'aria-expanded', 'false');
                setAttribute(panel, 'aria-expanded', 'false');
            }
            // in single select mode, remove aria-expanded from both elements
            // in case modes have changed between user actions
            else {
                removeAttribute(panel, 'aria-expanded');
                removeAttribute(tab, 'aria-expanded');
            }
            // determine if callback should fire
            if (!wasHidden) {
                this.triggerOptionCallback('onClose', [panel, tab]);
            }
        }
    }

    /**
     * @description deactivate all tabs and tab panels
     * @param {Element[]} [exceptions=[]] - tabs to ignore
     */
    deactivateTabs(exceptions = []) {
        const exceptionsIsArray = Array.isArray(exceptions);
        this.tabs.forEach(tab => {
            if (!exceptionsIsArray || exceptions.indexOf(tab) === -1) {
                this.deactivateTab(tab, false, true);
            }
        });
    }

    /**
     * @description move focus to a particular tab
     * @param {Number|Element} index
     */
    focusTab(index) {
        const tab = this.getTab(index);
        const arrowActivation = this.options.arrowActivation;
        if (arrowActivation && getAttribute(tab, 'aria-selected') !== 'true') {
            return this.activateTabWithTimer(tab);
        }
        if (tab) {
            tab.focus();
        }
    }

    /**
     * @description focus first tab
     */
    focusFirstTab() {
        this.focusTab(0);
    }

    /**
     * @description focus last tab
     */
    focusLastTab() {
        this.focusTab(this.tabs.length - 1);
    }

    /**
     * @description detect if a tab is deletable
     * @param {Element|Number} element
     */
    determineDeletable(element) {
        if (!this.options.deletable) {
            return;
        }
        const tab = this.getTab(element);
        if (!tab || getAttribute(tab, 'data-deletable') === 'false') {
            return;
        }

        // delete target tab
        this.deleteTab(tab);

        // update tabs and panels arrays for component
        this.generateArrays();

        // in multiple mode, move focus to closest tab
        // in single select mode, activate it if deleted tab was not selected
        const multiple = this.multiple;
        const index = tab[TAB_INDEX_PROP];
        const toFocus = index - 1 > -1 ? index - 1 : 0;
        if (!multiple && getAttribute(tab, 'aria-selected') === 'true') {
            this.activateTab(toFocus);
        } else if (this.tabs[toFocus]) {
            this.tabs[toFocus].focus();
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
        // attributes to remove from tabs and panels
        // retain aria-controls and aria-labelledby in case it is being refreshed
        // so the component can return to its previous state
        const attributes = 'aria-expanded aria-hidden hidden role tabindex';
        let i = this.tabs.length;
        while (i--) {
            const tab = this.tabs[i];
            // remove any bound events
            tab.removeEventListener('keydown', this.keydownEventListener);
            tab.removeEventListener('keyup', this.keyupEventListener);
            tab.removeEventListener('click', this.clickEventListener);
            // reset panel and tab attributes
            removeAttribute(this.panels[i], attributes);
            removeAttribute(tab, attributes);
            delete tab[TAB_INDEX_PROP];
        }
        if (this.tablist) {
            delete this.tablist[TABLIST_STORAGE_PROP];
            removeAttribute(this.tablist, 'role');
        }
        // reset element storage (to help with garbage collection)
        this.tablist = null;
        this.panels = null;
        this.tabs = null;
    }

    /**
     * @description get the ball rolling
     */
    init() {
        // set multiple before processing the tabs and panels
        this.checkMultiple();

        // store tabs and panels, and get the API and events ready
        this.generateArrays(true);
        this.generateApi();

        // store unique events for context handling and for removal when destroyed
        this.keydownEventListener = this.keydownEventListener.bind(this);
        this.clickEventListener = this.clickEventListener.bind(this);
        this.keyupEventListener = this.keyupEventListener.bind(this);

        // handle starting states
        const toActivate = [];
        this.tabs.forEach((tab, index) => {
            // bind listeners and set starting attributes for wcag
            this.setTabStartingAttributes(tab, index);
            this.addListeners(index);

            // determine if any tabs need to be activated to begin with
            const isSelected = getAttribute(tab, 'aria-selected') === 'true';
            if (isSelected && (this.multiple || !toActivate.length)) {
                toActivate.push(tab);
            }
        });

        setAttribute(this.tablist, 'role', 'tablist');
        if (this.tabs.length) {
            // ensure initialisng element has tablist role

            // ensure at least one tab gets activated in single select mode
            if (!this.multiple && !toActivate.length) {
                toActivate.push(this.tabs[0]);
            }

            // force de-activate all first to set attributes, then activate starting tabs
            this.deactivateTabs(toActivate);
            toActivate.forEach(tab => this.activateTab(tab, false, true));

            // ensure component is focusable, even if nothing is selected
            this.makeFocusable();
        }

        this.triggerOptionCallback('onReady', [this.tablist]);
    }
}

/**
 * @description expose AriaTablist at window level
 * @param {Element} element
 * @param {Object} options
 * @returns {Object}
 */
window['AriaTablist'] = (element, options) => new Tablist(element, options).api;

/**
 * @description AriaTablist function to be exposed
 * @param {Element} element
 * @param {Object} options
 * @returns {Object}
 */
export default function AriaTablist(element, options) {
    return new Tablist(element, options).api;
}
