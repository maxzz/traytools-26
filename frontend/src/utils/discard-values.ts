/**
 * Discard all keys value to undefined at the top level to break cross references.
 */
export function discardValues(obj: {} | undefined | null) {
    if (!obj) {
        return;
    }
    Object.keys(obj).forEach(
        (key) => {
            (obj as Record<string, any>)[key] = undefined;
        }
    );
}

/**
 * Discard all keys value to undefined deeply. They become undefined or null.
 * It will fail for keys with getters only:
 * 'Uncaught TypeError TypeError: Cannot set property kind of #<FileSystemHandle> which has only a getter'
 */
export function discardValuesDeep(obj: {} | undefined | null) {
    if (!obj) {
        return;
    }
    for (const key in obj) {
        if (!!obj && typeof (obj as Record<string, any>)[key] === 'object') {
            discardValuesDeep((obj as Record<string, any>)[key]);
        } else {
            (obj as Record<string, any>)[key] = undefined;
        }
    }
}
