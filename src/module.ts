import { SplitflowDesigner, createDesigner } from '@splitflow/designer'
import { SplitflowApp, getDefaultApp } from './app'
import { Datasource } from './datasource'
import { Dispatcher } from './dispatch'

export interface ModuleConfig {
    moduleId?: string
}

export function createSplitflowModule<U extends ModuleConfig, V extends SplitflowModule>(
    config?: U,
    app?: SplitflowApp,
    callback?: (
        dispatcher: Dispatcher,
        datasource: Datasource,
        designer: SplitflowDesigner,
        config: U
    ) => V
): V {
    app ??= getDefaultApp()
    config = { ...app.config, ...config }

    const { dispatcher, datasource } = app
    const designer = createDesigner(config)

    return callback(dispatcher, datasource, designer, config)
}

export class SplitflowModule {
    constructor(dispatcher: Dispatcher, datasource: Datasource, designer: SplitflowDesigner) {
        this.dispatcher = dispatcher
        this.datasource = datasource
        this.designer = designer
    }

    dispatcher: Dispatcher
    datasource: Datasource
    designer: SplitflowDesigner

    initialize() {
        this.designer.loadDefinitions()
    }
}
