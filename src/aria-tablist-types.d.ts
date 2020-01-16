export interface AriaTablistOptions {
    delay?: Number;
    tabindex?: number;
    deletable?: Boolean;
    focusableTabs?: Boolean;
    focusablePanels?: Boolean;
    arrowActivation?: Boolean;
    allArrows?: Boolean;
    tabSelector?: string;
    onOpen?: Function;
    onClose?: Function;
    onDelete?: Function;
    onReady?: Function;
}

export interface AriaTablistApi {
    tabs: HTMLElement[];
    panels: HTMLElement[];
    options: AriaTablistOptions;
    open(index: number | HTMLElement, setFocus?: Boolean): void;
    close(index: number | HTMLElement, setFocus?: Boolean): void;
    delete(index: number | HTMLElement): void;
    destroy(): void;
}

declare function AriaTablist(element: HTMLElement, options?: AriaTablistOptions): AriaTablistApi;
