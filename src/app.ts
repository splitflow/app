import { Datasource, createDatasource } from './datasource'
import { Dispatcher, createDisatcher } from './dispatch'
import * as actions from './actions'
import panel, { PanelState } from './stores/panel'
import dialog, { DialogState } from './stores/dialog'
import alert, { AlertState } from './stores/alert'

export interface AppConfig {
    projectId?: string
}

export class SplitflowApp {
    constructor(dispatcher: Dispatcher, datasource: Datasource, config?: AppConfig) {
        this.dispatcher = dispatcher
        this.datasource = datasource
        this.#config = config
    }

    dispatcher: Dispatcher
    datasource: Datasource
    #config: AppConfig

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
        return this.datasource.fetchResource<PanelState>({name: 'panel'})
    }

    get dialog() {
        return this.datasource.fetchResource<DialogState>({name: 'dialog'})
    }

    get alert() {
        return this.datasource.fetchResource<AlertState>({name: 'alert'})
    }
}

let defaultApp: SplitflowApp

export function initializeSplitflowApp(config: AppConfig): SplitflowApp
export function initializeSplitflowApp<T extends SplitflowApp>(
    config: AppConfig,
    App: new (dispatcher: Dispatcher, datasource: Datasource, config: AppConfig) => T
): T
export function initializeSplitflowApp(
    config: AppConfig,
    App?: new (dispatcher: Dispatcher, datasource: Datasource, config: AppConfig) => SplitflowApp
) {
    App ??= SplitflowApp

    if (defaultApp) {
        defaultApp = new App(defaultApp.dispatcher, defaultApp.datasource, config)
    } else {
        defaultApp = createSplitflowApp(config, App)
    }
    return defaultApp
}

export function createSplitflowApp(config: AppConfig): SplitflowApp
export function createSplitflowApp<T extends SplitflowApp>(
    config: AppConfig,
    App: new (dispatcher: Dispatcher, datasource: Datasource, config: AppConfig) => T
): T
export function createSplitflowApp(
    config: AppConfig,
    App?: new (dispatcher: Dispatcher, datasource: Datasource, config: AppConfig) => SplitflowApp
) {
    App ??= SplitflowApp

    const dispatcher = createDisatcher()
    dispatcher.addActionHandler('display', actions.display)
    dispatcher.addActionHandler('discard', actions.discard)
    dispatcher.addActionHandler('open', actions.open)
    dispatcher.addActionHandler('cancel', actions.cancel)
    dispatcher.addActionHandler('show', actions.show)

    const datasource = createDatasource()
    datasource.addResourceHandler('panel', () => panel)
    datasource.addResourceHandler('dialog', () => dialog)
    datasource.addResourceHandler('alert', () => alert)

    return new App(dispatcher, datasource, config)
}

export function getDefaultApp() {
    return (defaultApp ??= createSplitflowApp({}))
}
