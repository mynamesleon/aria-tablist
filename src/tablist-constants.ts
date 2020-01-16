// store keycodes for easy reference
// const instead of enum to reduce bundle size
export const KEYS = {
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETE: 46,
    ENTER: 13,
    SPACE: 32
};

// add or subtract depending on arrow key pressed
export const DIRECTION = {
    37: -1,
    38: -1,
    39: 1,
    40: 1
};

// properties used when storing tab index and tablist api on elements
export const TAB_INDEX_PROP = '_ariaTablistTabIndex';
export const TABLIST_STORAGE_PROP = 'ariaTablist';
