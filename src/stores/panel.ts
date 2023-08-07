import { writable } from '@splitflow/core/stores'

export interface PanelState {
    [panelName: string]: boolean
}

const panel = writable<PanelState>({})

export function display(panelName: string, discardPanels: string[]) {
    panel.update((p) => ({
        ...p,
        ...Object.fromEntries(discardPanels?.map((n) => [n, false]) ?? []),
        [panelName]: true
    }))
}

export function discard(panelName: string) {
    panel.update((p) => ({ ...p, [panelName]: false }))
}

export function isDisplayed(panelName: string) {
    return panel[panelName]
}

export default panel
