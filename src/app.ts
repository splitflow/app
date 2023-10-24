import { Datasource, createDatasource } from './datasource'
import { Dispatcher, Error, createDisatcher } from './dispatch'
import * as actions from './actions'
import panel, { PanelState } from './stores/panel'
import dialog, { DialogState } from './stores/dialog'
import alert, { AlertState } from './stores/alert'
import { SSRRegistry, SplitflowDesigner, createDesigner } from '@splitflow/designer'

export interface AppConfig {
    projectId?: string
    appId?: string
    devtool?: boolean
    ssr?: boolean
    local?: boolean
    remote?: boolean
}

export interface SplitflowApp {
    dispatcher: Dispatcher
    datasource: Datasource
    designer: SplitflowDesigner
}

let defaultApp: SplitflowApp

export interface SplitflowAppConstructor<T extends SplitflowApp> {
    new (
        dispatcher: Dispatcher,
        datasource: Datasource,
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

export function createSplitflowApp(config: AppConfig, arg2?: any, arg3?: any) {
    const registry = isSSRRegistry(arg2) ? arg2 : undefined
    const App = isSplitflowAppConstructor(arg2)
        ? arg2
        : isSplitflowAppConstructor(arg3)
        ? arg3
        : SplitflowApp

    const dispatcher = createDisatcher()
    const datasource = createDatasource()
    const designer = createDesigner(config, undefined, registry)

    return new App(dispatcher, datasource, designer, config)
}

export function getDefaultApp() {
    return (defaultApp ??= createSplitflowApp({}))
}

export class SplitflowApp {
    constructor(
        dispatcher: Dispatcher,
        datasource: Datasource,
        designer: SplitflowDesigner,
        config?: AppConfig
    ) {
        this.dispatcher = dispatcher
        this.datasource = datasource
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
    designer: SplitflowDesigner
    #config: AppConfig
    #initialize: Promise<{ error?: Error }>

    async initialize() {
        return (this.#initialize ??= (async () => {
            return this.designer.initialize()
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

function isSSRRegistry(value: any): value is SSRRegistry {
    return value?.style !== undefined
}

function isSplitflowAppConstructor(value: any): value is SplitflowAppConstructor<any> {
    return typeof value === 'function'
}
