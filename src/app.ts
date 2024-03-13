import { Datasource, createDatasource } from './datasource'
import { Dispatcher, Error, createDisatcher } from './dispatch'
import * as actions from './actions'
import panel, { PanelState } from './stores/panel'
import dialog, { DialogState } from './stores/dialog'
import alert, { AlertState } from './stores/alert'
import {
    DesignerBundle,
    SSRRegistry,
    SplitflowDesigner,
    SplitflowDesignerKit,
    createDesigner,
    createDesignerKit,
    loadSplitflowDesignerBundle
} from '@splitflow/designer'
import { Gateway, createGateway } from './gateway'
import { Writable, writable } from '@splitflow/core/stores'

function isWritable(object: any): object is Writable<any> {
    if (!!object?.subscribe && !!object?.set) return true
    return false
}

export interface AppConfig {
    accountId?: string
    appId?: string
    devtool?: boolean
    ssr?: boolean
    local?: boolean
    remote?: boolean
}

export interface SplitflowApp {
    dispatcher: Dispatcher
    datasource: Datasource
    gateway: Gateway
    designer: SplitflowDesigner
}

let defaultApp: SplitflowApp

export interface SplitflowAppConstructor<T extends SplitflowApp> {
    new (
        dispatcher: Dispatcher,
        datasource: Datasource,
        gateway: Gateway,
        designer: SplitflowDesigner,
        config: AppConfig
    ): T
}

export function initializeSplitflowApp(config: AppConfig): SplitflowApp
export function initializeSplitflowApp<T extends SplitflowApp>(
    config: AppConfig,
    App: SplitflowAppConstructor<T>
): T
export function initializeSplitflowApp(
    config: AppConfig,
    App?: SplitflowAppConstructor<SplitflowApp>
) {
    App ??= SplitflowApp

    if (defaultApp) {
        defaultApp = new App(
            defaultApp.dispatcher,
            defaultApp.datasource,
            defaultApp.gateway,
            defaultApp.designer,
            config
        )
    } else {
        defaultApp = createSplitflowApp(config, App)
    }
    return defaultApp
}

export function createSplitflowApp(config: AppConfig, registry?: SSRRegistry): SplitflowApp

export function createSplitflowApp<T extends SplitflowApp>(
    config: AppConfig,
    App: SplitflowAppConstructor<T>
): T

export function createSplitflowApp<T extends SplitflowApp>(
    config: AppConfig,
    registry: SSRRegistry,
    App: SplitflowAppConstructor<T>
): T

export function createSplitflowApp(init: AppConfig | AppBundle, arg2?: any, arg3?: any) {
    const bundle = isAppBundle(init) ? init : undefined
    const config = isAppBundle(init) ? init.config : init

    const registry = isSSRRegistry(arg2) ? arg2 : undefined
    const App = isSplitflowAppConstructor(arg2)
        ? arg2
        : isSplitflowAppConstructor(arg3)
        ? arg3
        : SplitflowApp

    const dispatcher = createDisatcher()
    const datasource = createDatasource()
    const designer = createDesigner(bundle ?? { ...config, moduleType: 'app' }, undefined, registry)
    const gateway = createGateway()

    return new App(dispatcher, datasource, gateway, designer, config)
}

export function getDefaultApp() {
    return (defaultApp ??= createSplitflowApp({}))
}

export class SplitflowApp {
    constructor(
        dispatcher: Dispatcher,
        datasource: Datasource,
        gateway: Gateway,
        designer: SplitflowDesigner,
        config: AppConfig
    ) {
        this.dispatcher = dispatcher
        this.datasource = datasource
        this.gateway = gateway
        this.designer = designer
        this.#config = config

        dispatcher.addActionHandler('display', actions.display)
        dispatcher.addActionHandler('discard', actions.discard)
        dispatcher.addActionHandler('open', actions.open)
        dispatcher.addActionHandler('cancel', actions.cancel)
        dispatcher.addActionHandler('show', actions.show)

        datasource.addResourceHandler('panel', () => panel)
        datasource.addResourceHandler('dialog', () => dialog)
        datasource.addResourceHandler('alert', () => alert)
    }

    dispatcher: Dispatcher
    datasource: Datasource
    gateway: Gateway
    designer: SplitflowDesigner
    #config: AppConfig
    #initialize: Promise<{ app?: SplitflowApp; error?: Error }>

    async initialize() {
        return (this.#initialize ??= (async () => {
            const { error } = await this.designer.initialize()

            if (error) return { error }
            return { app: this }
        })())
    }

    display(panelName: string, discardPanels?: string[]) {
        const action: actions.PanelAction = { type: 'display', name: panelName, discardPanels }
        this.dispatcher.dispatchAction(action)
    }

    discard(panelName: string) {
        const action: actions.PanelAction = { type: 'discard', name: panelName }
        this.dispatcher.dispatchAction(action)
    }

    open<T>(dialogName: string, value?: T | Writable<T>, close?: (value: T) => void) {
        value = isWritable(value) ? value : writable(value)
        const action: actions.DialogAction = { type: 'open', name: dialogName, value, close }
        this.dispatcher.dispatchAction(action)
        return value
    }

    cancel(dialogName: string) {
        const action: actions.DialogAction = { type: 'cancel', name: dialogName }
        this.dispatcher.dispatchAction(action)
    }

    get config() {
        return this.#config
    }

    get panel() {
        return this.datasource.fetchResource<PanelState>({ name: 'panel' })
    }

    get dialog() {
        return this.datasource.fetchResource<DialogState>({ name: 'dialog' })
    }

    get alert() {
        return this.datasource.fetchResource<AlertState>({ name: 'alert' })
    }
}

export function createSplitflowAppKit(
    config: AppConfig,
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) {
    const gateway = createGateway({}, fetch)
    const designer = createDesignerKit({ ...config, moduleType: 'app' })

    return {
        gateway,
        designer,
        config
    }
}

export interface SplitflowAppKit {
    gateway: Gateway
    designer: SplitflowDesignerKit
    config: AppConfig
}

export interface AppBundle extends DesignerBundle {
    config: AppConfig
}

export function isAppBundle(bundle: AppBundle | AppConfig): bundle is AppBundle {
    return !!(bundle as any).config
}

export async function loadSplitflowAppBundle(kit: SplitflowAppKit): Promise<AppBundle> {
    const bundle1 = await loadSplitflowDesignerBundle(kit.designer)
    return { config: kit.config, ...bundle1 }
}

function isSSRRegistry(value: any): value is SSRRegistry {
    return value?.style !== undefined
}

function isSplitflowAppConstructor(value: any): value is SplitflowAppConstructor<any> {
    return typeof value === 'function'
}
