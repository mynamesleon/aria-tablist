/**
 * helper to prevent default event behaviour
 */
export function preventDefault(event?: Event | any) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
}

/**
 * get attribute helper for consistent response
 */
export function getAttribute(element: Element, attribute: string): string {
    return (element.getAttribute && element.getAttribute(attribute)) || '';
}

/**
 * set attribute helper to handle element existence check
 */
export function setAttribute(element: Element, attribute: string, value: any) {
    if (element && getAttribute(element, attribute) !== value) {
        element.setAttribute && element.setAttribute(attribute, value);
    }
}

/**
 * helper to remove attribute(s) from element
 */
export function removeAttributes(element: Element, attr: string) {
    if (element && attr && element.removeAttribute) {
        attr.split(' ').forEach((a: string) => a && element.removeAttribute(a));
    }
}
