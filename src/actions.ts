import { Writable } from '@splitflow/core/stores'
import { Result } from './dispatch'
import * as dialog from './stores/dialog'
import * as panel from './stores/panel'
import * as alert from './stores/alert'

export interface PanelAction {
    type: 'display' | 'discard'
    name: string
    discardPanels?: string[]
}

export interface DialogAction {
    type: 'open' | 'cancel'
    name: string
    value?: Writable<unknown>
    close?: (value: unknown) => void
    target?: EventTarget
}

export interface AlertAction {
    type: 'show'
    name: string
    value: string
    error: boolean
    delay?: number
    dismiss?: () => void
}

export function display(action: PanelAction): Result {
    panel.display(action.name, action.discardPanels)
    return {}
}

export function discard(action: PanelAction): Result {
    panel.discard(action.name)
    return {}
}

export function open(action: DialogAction): Result {
    const { type, name, value, close, ...data } = action
    dialog.open(name, value, close, data)
    return {}
}

export function cancel(action: DialogAction): Result {
    dialog.cancel(action.name)
    return {}
}

export function show(action: AlertAction): Result {
    const { type, name, value, error, delay, dismiss, ...data } = action
    alert.show(name, value, error, delay, dismiss, data)
    return {}
}
