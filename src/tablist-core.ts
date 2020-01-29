import { TablistApi } from './tablist-api';
import { TablistOptions } from './tablist-options';
import { IAriaTablistOptions, IAriaTablistApi } from './aria-tablist-types';
import { KEYS, DIRECTION, TAB_INDEX_PROP, TABLIST_STORAGE_PROP } from './tablist-constants';
import { preventDefault, getAttribute, setAttribute, removeAttributes } from './tablist-helpers';

/**
 * incremental index used for element ID generation
 */
let appIndex: number = 0;

/**
 * create a Tablist
 */
export class Tablist {
    api: TablistApi;
    tabTimer: number;
    multiple: Boolean;
    tablist: HTMLElement;
    options: IAriaTablistOptions;
    tabs: HTMLElement[] = [];
    panels: HTMLElement[] = [];

    constructor(element: HTMLElement, options?: IAriaTablistOptions) {
        if (!element || element.nodeType !== 1) {
            return;
        }

        // if instance already exists for this element, destroy and re-make
        const storedApi: IAriaTablistApi = element[TABLIST_STORAGE_PROP];
        if (storedApi && typeof storedApi.destroy === 'function') {
            storedApi.destroy();
        }

        appIndex += 1;
        this.tablist = element;
        this.options = new TablistOptions(options);
        this.api = new TablistApi(this);
        this.init();
    }

    /**
     * get multiple value from tablist element;
     * has own method so can be re-checked on each user interaction
     */
    checkMultiple() {
        this.multiple = getAttribute(this.tablist, 'aria-multiselectable') === 'true';
    }

    /**
     * trigger a callback
     * @param name callback name
     * @param args arguments to provide
     */
    triggerOptionCallback(name: string, args: any[] = []) {
        if (this.options && typeof this.options[name] === 'function') {
            return this.options[name].apply(this.api, args);
        }
    }

    /**
     * ensure at least one tab is focusable
     */
    makeFocusable() {
        // use normal loop instead of forEach so that we only process as many as we need to
        const tabindex: string = `${this.options.tabindex || 0}`;
        for (let i = 0, l = this.tabs.length; i < l; i += 1) {
            if (getAttribute(this.tabs[i], 'tabindex') === tabindex) {
                return;
            }
        }
        // default to setting first tab to be focusable (to match radio button behaviour)
        setAttribute(this.tabs[0], 'tabindex', tabindex);
    }

    /**
     * set core role and aria attributes on tab and panel
     * @param tab tab to add attributes to
     * @param panel panel to add attributes to
     * @param index used for ID generation
     */
    setCoreAttributes(tab: HTMLElement, panel: HTMLElement, index: number) {
        const tabindex: number | string = this.options.tabindex || '0';

        // add to page tabbing order
        if (this.options.focusableTabs) {
            setAttribute(tab, 'tabindex', tabindex);
        }
        if (this.options.focusablePanels) {
            setAttribute(panel, 'tabindex', tabindex);
        }

        // set ids generated from app index and tab index if needed
        if (!tab.id) {
            setAttribute(tab, 'id', `aria-tablist-${appIndex}-tab-${index}`);
        }
        if (!panel.id) {
            setAttribute(panel, 'id', `aria-tablist-${appIndex}-panel-${index}`);
        }

        // ensure connection between tab and panel, and roles
        setAttribute(tab, 'role', 'tab');
        setAttribute(panel, 'role', 'tabpanel');
        setAttribute(tab, 'aria-controls', panel.id);
        setAttribute(panel, 'aria-labelledby', tab.id);
    }

    /**
     * get panel for a tab, using tab element, or index
     * @param element element or index
     */
    getTabPanel(element: HTMLElement | number): HTMLElement {
        // if an index was used, assume it is for an already stored tab
        const tab: HTMLElement = typeof element === 'number' ? this.tabs[element] : element;
        if (!tab || tab.nodeType !== 1) {
            return null;
        }

        // if an index was used, check panels array before searching the DOM
        let panel: HTMLElement = typeof element === 'number' ? this.panels[element] : null;
        if (panel) {
            return panel;
        }

        // if tab controls an element, search based on that
        let controls: string = getAttribute(tab, 'aria-controls');
        // also check data-controls attribute
        if (!controls) {
            controls = getAttribute(tab, 'data-controls');
        }
        if (controls) {
            panel = document.getElementById(controls);
        }

        // if still no panel...
        if (!panel) {
            // if tab controlled an element, but was not found, remove that connection
            if (controls) {
                removeAttributes(tab, 'aria-controls');
            }
            // if the tab has an id, look for a panel based on that
            if (tab.id) {
                panel = document.querySelector(`[aria-labelledby="${tab.id}"]`);
            }
            // also check data-labelledby attribute
            if (!panel) {
                panel = document.querySelector(`[data-labelledby="${tab.id}"]`);
            }
        }
        return panel;
    }

    /**
     * generate tabs and panels arrays
     * @param isStartingCheck
     */
    generateArrays(isStartingCheck?: Boolean) {
        // empty arrays using splice so that references in the API are correct
        this.tabs.splice(0);
        this.panels.splice(0);

        // if no tab role elements found, assume tablist children could be the tabs
        let tabs: NodeListOf<HTMLElement> = this.tablist.querySelectorAll(this.options.tabSelector);
        if (isStartingCheck && !tabs.length) {
            tabs = this.tablist.childNodes as NodeListOf<HTMLElement>;
        }

        // create tabs and panels arrays
        // only for tabs that control an element, or have a panel labelled by it
        for (let i = 0, l = tabs.length; i < l; i += 1) {
            const tab: HTMLElement = tabs[i];
            // do not process non-element nodes - also check against panels Array
            // (when processing childNodes, tabs and panels could be siblings)
            if (!tab || tab.nodeType !== 1 || this.panels.indexOf(tab) > -1) {
                continue;
            }

            // ensure tab has an associated panel
            // if not, and the element had the `tab` role, remove it to prevent confusion
            const panel: HTMLElement = this.getTabPanel(tab);
            if (!panel) {
                if (getAttribute(tab, 'role') === 'tab') {
                    removeAttributes(tab, 'role');
                }
                continue;
            }

            // store in their respective arrays
            this.tabs.push(tab);
            this.panels.push(panel);
            this.setCoreAttributes(tab, panel, i);

            // store index on the tab itself for arrow keypresses
            tab[TAB_INDEX_PROP] = this.tabs.length - 1;
        }
    }

    /**
     * check if an element is a stored tab
     * @param element
     */
    elementIsTab(element: HTMLElement): Boolean {
        return !!(element && this.tabs.indexOf(element) > -1);
    }

    /**
     * bind event listeners to tab of a certain index
     * @param index
     */
    addListenersToTab(index: number) {
        const tab = this.tabs[index];
        tab.addEventListener('keydown', this.tabKeydownEvent);
        tab.addEventListener('keyup', this.tabKeyupEvent);
        tab.addEventListener('click', this.tabClickEvent);
    }

    /**
     * click handling for tabs
     * @param event
     */
    tabClickEvent(event: Event) {
        let element = event.target as HTMLElement;
        do {
            if (this.elementIsTab(element)) {
                this.checkMultiple();
                preventDefault(event);
                return this.activateTabWithTimer(element, false);
            }
            element = element.parentElement || (element.parentNode as HTMLElement);
        } while (element !== null && element.nodeType === 1);
    }

    /**
     * keydown handling for tabs
     * @param event
     */
    tabKeydownEvent(event: KeyboardEvent) {
        // ensure keydown event was directly on the tab, in case there are focusable child elements
        if (this.elementIsTab(event.target as HTMLElement)) {
            switch (event.keyCode) {
                case KEYS.END: // activate last tab
                    preventDefault(event);
                    this.focusLastTab();
                    break;
                case KEYS.HOME: // activate first tab
                    preventDefault(event);
                    this.focusFirstTab();
                    break;
                case KEYS.UP: // up, down, left, and right are in keydown to prevent page scroll
                case KEYS.DOWN:
                case KEYS.LEFT:
                case KEYS.RIGHT:
                    this.processArrowPress(event);
                    break;
                case KEYS.SPACE:
                case KEYS.ENTER:
                    preventDefault(event);
                    break;
            }
        }
    }

    /**
     * keyup handling for tabs
     * @param event
     */
    tabKeyupEvent(event: KeyboardEvent) {
        // ensure keyup event was directly on the tab, in case there are focusable child elements
        const target = event.target as HTMLElement;
        if (this.elementIsTab(target)) {
            switch (event.keyCode) {
                case KEYS.DELETE:
                    this.determineDeletable(target);
                    break;
                case KEYS.ENTER:
                case KEYS.SPACE:
                    this.checkMultiple();
                    preventDefault(event);
                    this.activateTabWithTimer(target);
                    break;
            }
        }
    }

    /**
     * arrow press handling for tabs
     * @param event
     */
    processArrowPress(event: KeyboardEvent) {
        const key = event.keyCode;
        // when a tablist aria-orientation is set to vertical only up and down arrow should function
        // in all other cases only left and right arrows should function
        const proceed =
            this.options.allArrows ||
            (getAttribute(this.tablist, 'aria-orientation') === 'vertical'
                ? key === KEYS.UP || key === KEYS.DOWN
                : key === KEYS.LEFT || key === KEYS.RIGHT);

        if (proceed) {
            this.switchTabOnArrowPress(event);
        }
    }

    /**
     * move focus to another tab due to arrow press
     * @param event
     */
    switchTabOnArrowPress(event: KeyboardEvent) {
        const pressed: number = event.keyCode;
        let direction: number = DIRECTION[pressed];
        const currentIndex: number = (event.target as HTMLElement)[TAB_INDEX_PROP];

        if (!direction || typeof currentIndex !== 'number') {
            return;
        }

        preventDefault(event);

        // reverse direction for right-to-left pages
        const isLeftOrRight = pressed === KEYS.LEFT || pressed === KEYS.RIGHT;
        const reverse = isLeftOrRight && (document.dir === 'rtl' || this.tablist.dir === 'rtl');
        // do a final check for explicit ltr on the tablist, in case it differs from the document
        if (reverse && this.tablist.dir !== 'ltr') {
            direction = direction * -1;
        }

        // determine which tab to move to
        const toFocus = currentIndex + direction;
        if (this.tabs[toFocus]) {
            this.focusTab(toFocus);
        } else if (pressed === KEYS.LEFT || pressed === KEYS.UP) {
            if (reverse) {
                this.focusFirstTab();
            } else {
                this.focusLastTab();
            }
        } else if (pressed === KEYS.RIGHT || pressed == KEYS.DOWN) {
            if (reverse) {
                this.focusLastTab();
            } else {
                this.focusFirstTab();
            }
        }
    }

    /**
     * get tab based on index, or check that element is a tab
     * @param elem
     */
    getTab(elem: any): HTMLElement {
        return typeof elem === 'number' && this.elementIsTab(this.tabs[elem])
            ? this.tabs[elem]
            : this.elementIsTab(elem)
            ? elem
            : null;
    }

    /**
     * activate any given tab with a delay
     * @param element HTMLElement or index
     * @param setFocus
     * @param force
     */
    activateTabWithTimer(element: HTMLElement | number, setFocus?: Boolean, force?: Boolean) {
        if (this.tabTimer) {
            clearTimeout(this.tabTimer);
        }

        const delay = typeof this.options.delay === 'number' ? this.options.delay : 0;
        this.tabTimer = setTimeout(() => {
            this.activateTab(element, setFocus, force);
        }, delay);
    }

    /**
     * activate any given tab panel
     * @param element HTMLElement or index
     * @param setFocus
     * @param force
     */
    activateTab(element: HTMLElement | number, setFocus: Boolean = true, force: Boolean = false) {
        const tab: HTMLElement = this.getTab(element);

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
        const isSelected: Boolean = getAttribute(tab, 'aria-selected') === 'true';
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
        const tabindex: number | string = this.options.tabindex || '0';
        setAttribute(tab, 'tabindex', tabindex);
        setAttribute(tab, 'aria-selected', 'true');

        // remove hidden attribute from tab panel to make it visible
        const panel: HTMLElement = this.getTabPanel(element);
        if (panel) {
            // store if it was hidden, to determine if callback should fire
            const wasHidden: Boolean = getAttribute(panel, 'hidden') === 'hidden';
            removeAttributes(panel, 'hidden aria-hidden');
            // set expanded, only on multi-selectable tablists
            if (this.multiple) {
                setAttribute(panel, 'aria-expanded', 'true');
                setAttribute(tab, 'aria-expanded', 'true');
            }
            // ensure panel is in the normal tabbing order
            if (this.options.focusablePanels) {
                setAttribute(panel, 'tabindex', tabindex);
            }
            if (wasHidden) {
                this.triggerOptionCallback('onOpen', [panel, tab]);
            }
        }
    }

    /**
     * deactivate tab (and hide panel) by element or index
     * @param element
     * @param setFocus
     * @param force
     */
    deactivateTab(element: HTMLElement | number, setFocus: Boolean = false, force: Boolean = false) {
        const tab: HTMLElement = this.getTab(element);
        if (!tab) {
            return;
        }

        // set focus before closing, for event order
        if (setFocus) {
            tab.focus();
        }

        // ensure tabindex gets set even when disabled, for programmatic focusing
        // and in case options change between activations
        const focusableTabs: Boolean = this.options.focusableTabs;
        const tabindex: number | string = focusableTabs ? this.options.tabindex || '0' : '-1';
        setAttribute(tab, 'tabindex', tabindex);

        // allow force closing (used on other tabs in single-select mode)
        if (!force && getAttribute(tab, 'aria-disabled') === 'true') {
            return;
        }

        setAttribute(tab, 'aria-selected', 'false');
        const panel: HTMLElement = this.getTabPanel(element);
        if (panel) {
            // store if it was hidden, to determine if callback should fire
            const wasHidden: Boolean = getAttribute(panel, 'hidden') === 'hidden';
            // now do the hiding
            removeAttributes(panel, 'tabindex');
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
                removeAttributes(panel, 'aria-expanded');
                removeAttributes(tab, 'aria-expanded');
            }
            // determine if callback should fire
            if (!wasHidden) {
                this.triggerOptionCallback('onClose', [panel, tab]);
            }
        }
    }

    /**
     * deactivate all tabs and tab panels
     * @param exceptions element(s) to exclude from deactivation
     */
    deactivateTabs(exceptions: HTMLElement[] = []) {
        const exceptionsIsArray = Array.isArray(exceptions);
        this.tabs.forEach(tab => {
            if (!exceptionsIsArray || exceptions.indexOf(tab) === -1) {
                this.deactivateTab(tab, false, true);
            }
        });
    }

    /**
     * move keyboard-based focus to a particular tab, by element or index
     * @param index
     */
    focusTab(index: number | HTMLElement) {
        const tab: HTMLElement = this.getTab(index);
        const arrowActivation: Boolean = this.options.arrowActivation;
        if (tab) {
            if (arrowActivation && getAttribute(tab, 'aria-selected') !== 'true') {
                this.activateTabWithTimer(tab);
                return;
            }
            tab.focus();
        }
    }

    /**
     * focus on first tab
     */
    focusFirstTab() {
        this.focusTab(0);
    }

    /**
     * focus on last tab
     */
    focusLastTab() {
        this.focusTab(this.tabs.length - 1);
    }

    /**
     * detect if a tab is deletable
     * @element tab by element or index
     */
    determineDeletable(element: HTMLElement | number) {
        if (!this.options.deletable) {
            return;
        }
        const tab: HTMLElement = this.getTab(element);
        if (!tab || getAttribute(tab, 'data-deletable') === 'false') {
            return;
        }

        // delete target tab
        this.checkMultiple();
        this.deleteTab(tab);

        // update tabs and panels arrays for component
        this.generateArrays();

        // in multiple mode, move focus to closest tab
        // in single select mode, activate it if deleted tab was not selected
        const index: number = tab[TAB_INDEX_PROP];
        const toFocus: number = index - 1 > -1 ? index - 1 : 0;
        if (!this.multiple && getAttribute(tab, 'aria-selected') === 'true') {
            this.activateTab(toFocus);
        } else if (this.tabs[toFocus]) {
            this.tabs[toFocus].focus();
        }

        // if none of the tabs are focusable, set tabindex="0" on first one
        this.makeFocusable();
        this.triggerOptionCallback('onDelete', [tab]);
    }

    /**
     * deletes a tab and its panel
     * @param tab
     */
    deleteTab(tab: HTMLElement) {
        const panel: HTMLElement = this.getTabPanel(tab);
        tab.parentElement.removeChild(tab);
        if (panel) {
            panel.parentElement.removeChild(panel);
        }
    }

    /**
     * destroy component behaviour and events
     */
    destroy() {
        // attributes to remove from tabs and panels
        // retain aria-controls and aria-labelledby in case it is being refreshed
        // so the component can return to its previous state
        const attributes = 'aria-expanded aria-hidden hidden role tabindex';
        this.tabs.forEach((tab, index) => {
            // remove any bound events
            tab.removeEventListener('keydown', this.tabKeydownEvent);
            tab.removeEventListener('keyup', this.tabKeyupEvent);
            tab.removeEventListener('click', this.tabClickEvent);
            // reset panel and tab attributes
            removeAttributes(this.panels[index], attributes);
            removeAttributes(tab, attributes);
            delete tab[TAB_INDEX_PROP];
        });
        if (this.tablist) {
            delete this.tablist[TABLIST_STORAGE_PROP];
            removeAttributes(this.tablist, 'role');
        }
        // reset element storage (to help with garbage collection)
        this.panels.splice(0);
        this.tabs.splice(0);
        this.tablist = null;
    }

    /**
     * initialise the module
     */
    init() {
        // set multiple before processing the tabs and panels
        this.checkMultiple();

        // store tabs and panels, and get the API and events ready
        this.generateArrays(true);

        // store unique events for context handling and for removal when destroyed
        this.tabKeydownEvent = this.tabKeydownEvent.bind(this);
        this.tabClickEvent = this.tabClickEvent.bind(this);
        this.tabKeyupEvent = this.tabKeyupEvent.bind(this);

        // handle starting states
        const toActivate: HTMLElement[] = [];
        this.tabs.forEach((tab, index) => {
            this.addListenersToTab(index);
            // determine if any tabs need to be activated to begin with
            const isSelected: Boolean =
                getAttribute(tab, 'aria-selected') === 'true' || getAttribute(tab, 'data-selected') === 'true';
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
