import { writable } from '@splitflow/core/stores'

export interface AlertState {
    [alertName: string]: AlertData
}

export interface AlertData {
    value: string
    error: boolean
    dismiss: () => void
}

const alert = writable<AlertState>({})

let closeTimer: NodeJS.Timeout

export function show(
    alertName: string,
    value: string,
    error: boolean,
    delay = 1000,
    dismiss: () => void,
    data: object
) {
    const alertData = {
        ...data,
        value,
        error,
        dismiss: () => {
            dismiss?.()
            alert.set({})
        }
    }

    alert.set({ [alertName]: alertData })

    clearTimeout(closeTimer)
    if (delay) {
        closeTimer = setTimeout(() => alert.set({}), delay)
    }
}

export default alert
