import { AriaTablistOptions } from './aria-tablist-types';

export class TablistOptions {
    delay: Number = 0;
    tabindex: number = 0;
    deletable: Boolean = false;
    focusableTabs: Boolean = false;
    focusablePanels: Boolean = true;
    arrowActivation: Boolean = false;
    allArrows: Boolean = false;
    tabSelector: string = '[role="tab"]';

    onOpen?: Function;
    onClose?: Function;
    onDelete?: Function;
    onReady?: Function;

    constructor(options: AriaTablistOptions = {}) {
        for (const i in options) {
            if (options.hasOwnProperty(i) && typeof options[i] !== 'undefined') {
                this[i] = options[i];
            }
        }
    }
}
