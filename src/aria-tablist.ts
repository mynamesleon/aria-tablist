import { Tablist } from './tablist-core';
import { TablistApi } from './tablist-api';
import { AriaTablistOptions } from './aria-tablist-types';

// expose at window level
window['AriaTablist'] = function(element: HTMLElement, options?: AriaTablistOptions): TablistApi {
    return new Tablist(element, options).api;
};

// normal export
export default function AriaTablist(element: HTMLElement, options?: AriaTablistOptions): TablistApi {
    return new Tablist(element, options).api;
}
