import { Writable, writable } from '@splitflow/core/stores'

export interface DialogState {
    [dialogName: string]: DialogData<unknown>
}

export interface DialogData<T> {
    value: Writable<T>
    close: (value: T) => void
    cancel: () => void
}

const dialog = writable<DialogState>({})

export function open(
    dialogName: string,
    value: Writable<unknown>,
    close: (value: unknown) => void,
    data: object
) {
    const dialogData = {
        ...data,
        value,
        close: (value: unknown) => {
            close?.(value)
            dialog.update((d) => ({ ...d, [dialogName]: null }))
        },
        cancel: () => {
            close?.(undefined)
            dialog.update((d) => ({ ...d, [dialogName]: null }))
        }
    }

    dialog.update((d) => ({ ...d, [dialogName]: dialogData }))
    return value
}

export function cancel(dialogName: string) {
    dialog.update((d) => ({ ...d, [dialogName]: null }))
}

export function isOpened(dialogName: string) {
    return dialog[dialogName]
}

export default dialog
