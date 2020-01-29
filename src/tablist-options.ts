import { IAriaTablistOptions } from './aria-tablist-types';

export class TablistOptions {
    /**
     * delay in milliseconds before showing tab(s) from user interaction
     */
    delay: number = 0;

    /**
     * allow tab deletion via the keyboard - can be overridden per tab by setting `data-deletable="false"`
     */
    deletable: boolean = false;

    /**
     * make all tabs focusable in the page's tabbing order (by setting a `tabindex` on them), instead of just 1
     */
    focusableTabs: boolean = false;

    /**
     * make all tab panels focusable in the page's tabbing order (by setting a `tabindex` on them)
     */
    focusablePanels: boolean = true;

    /**
     * activate a tab when it receives focus from using the arrow keys
     */
    arrowActivation: boolean = false;

    /**
     * enable all arrow keys for moving focus, instead of horizontal or vertical arrows based on `aria-orientation` attribute
     * (left and up for previous, right and down for next)
     */
    allArrows: boolean = false;

    /**
     * the selector to use when initially searching for tab elements;
     * if none are found, all direct children of the main element will be processed
     */
    tabSelector: string = '[role="tab"]';

    /**
     * value to use when setting tabs or panels to be part of the page's tabbing order
     */
    tabindex: number | string = 0;

    /**
     * callback each time a tab opens
     */
    onOpen: (panel: HTMLElement, tab: HTMLElement) => void;

    /**
     * callback each time a tab closes
     */
    onClose: (panel: HTMLElement, tab: HTMLElement) => void;

    /**
     * callback when a tab is deleted
     */
    onDelete: (tab: HTMLElement) => void;

    /**
     * callback once ready
     */
    onReady: (tablist: HTMLElement) => void;

    constructor(options: IAriaTablistOptions = {}) {
        for (const i in options) {
            if (options.hasOwnProperty(i) && typeof options[i] !== 'undefined') {
                this[i] = options[i];
            }
        }
    }
}
