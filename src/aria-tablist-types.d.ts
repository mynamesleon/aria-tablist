export interface IAriaTablistOptions {
    delay?: number;
    tabindex?: number | string;
    deletable?: boolean;
    focusableTabs?: boolean;
    focusablePanels?: boolean;
    arrowActivation?: boolean;
    allArrows?: boolean;
    tabSelector?: string;
    onOpen?(panel: HTMLElement, tab: HTMLElement): void;
    onClose?(panel: HTMLElement, tab: HTMLElement): void;
    onDelete?(tab: HTMLElement): void;
    onReady?(tablist: HTMLElement): void;
}

export interface IAriaTablistApi {
    tabs: HTMLElement[];
    panels: HTMLElement[];
    options: IAriaTablistOptions;
    open(index: number | HTMLElement, setFocus?: boolean): void;
    close(index: number | HTMLElement, setFocus?: boolean): void;
    delete(index: number | HTMLElement): void;
    destroy(): void;
}

declare function AriaTablist(element: HTMLElement, options?: IAriaTablistOptions): IAriaTablistApi;

export default AriaTablist;
