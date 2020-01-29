import { Tablist } from './tablist-core';
import { IAriaTablistOptions } from './aria-tablist-types';
import { TABLIST_STORAGE_PROP } from './tablist-constants';

// generate Tablist API to expose to users
export class TablistApi {
    tabs: HTMLElement[];
    panels: HTMLElement[];
    options: IAriaTablistOptions;

    // provide Tablist instance
    constructor(instance: Tablist) {
        this.tabs = instance.tabs;
        this.panels = instance.panels;
        this.options = instance.options;
        // bind to Tablist to keep it private
        this.open = this.open.bind(instance);
        this.close = this.close.bind(instance);
        this.delete = this.delete.bind(instance);
        this.destroy = this.destroy.bind(instance);
        // store API on the Tablist element
        instance.tablist[TABLIST_STORAGE_PROP] = this;
    }

    open(this: Tablist, tab: Number | HTMLElement, setFocus?: Boolean) {
        this.checkMultiple();
        this.activateTabWithTimer.apply(this, [tab, setFocus, true]); // force open
    }

    close(this: Tablist, tab: Number | HTMLElement, setFocus?: Boolean) {
        this.checkMultiple();
        this.deactivateTab.apply(this, [tab, setFocus, true]); // force close
        this.makeFocusable();
    }

    delete(this: Tablist, tab: Number | HTMLElement) {
        this.determineDeletable.call(this, tab);
    }

    // unbind Tablist events and remove attributes
    destroy(this: Tablist) {
        this.destroy.call(this);
    }
}
