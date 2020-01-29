import { Tablist } from './tablist-core';
import { IAriaTablistOptions, IAriaTablistApi } from './aria-tablist-types';

// expose at window level
export function AriaTablist(element: HTMLElement, options?: IAriaTablistOptions): IAriaTablistApi {
    return new Tablist(element, options).api;
}

// normal export
export default AriaTablist;
