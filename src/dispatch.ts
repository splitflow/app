interface Record {
    handler: (action: Action, context: any, next?: () => any) => any
    context: any
}

export interface Action {
    type: string
}

export interface Result {
    error?: Error
}

export interface Error {
    code: string
    message: string
}

export interface DispatchOptions {
    multiDispatch?: boolean
    discriminator?: unknown
}

export interface Dispatcher {
    addActionHandler<C, R extends Result>(
        type: string,
        handler: (action: Action, context?: C, next?: () => R) => R,
        context?: C
    ): void
    addActionHandler<C, R extends Result>(
        type: string,
        handler: (action: Action, context?: C, next?: () => Promise<R>) => Promise<R>,
        context?: C
    ): void
    removeActionHandler<C, R extends Result>(
        type: string,
        handler: (action: Action, context?: C, next?: () => R) => R,
        context?: C
    ): void
    removeActionHandler<C, R extends Result>(
        type: string,
        handler: (action: Action, context?: C, next?: () => Promise<R>) => Promise<R>,
        context?: C
    ): void
    dispatchAction<R extends Result>(action: Action, options?: DispatchOptions): R
    dispatchAsyncAction<R extends Result>(action: Action, options?: DispatchOptions): Promise<R>
}

export function createDisatcher(): Dispatcher {
    const handlerRegistry = new Map<string, Array<Record>>()
    const interceptorRegistry = new Map<string, Array<Record>>()

    function addActionHandler(
        type: string,
        handler: (action: Action, context?: any, next?: () => any) => any,
        context?: any
    ) {
        const registry = handler.length === 3 ? interceptorRegistry : handlerRegistry

        let records = registry.get(type)
        if (!records) {
            records = new Array()
            registry.set(type, records)
        }
        if (records.findIndex((r) => r.handler === handler && r.context === context) < 0) {
            records.unshift({ handler, context })
        }
    }

    function removeActionHandler(
        type: string,
        handler: (action: Action, context?: any, next?: () => any) => any,
        context?: any
    ) {
        const registry = handler.length === 3 ? interceptorRegistry : handlerRegistry

        let records = registry.get(type)
        if (records) {
            const index = records.findIndex((r) => r.handler === handler && r.context === context)
            records.splice(index, 1)
        }
    }

    function dispatchAction(action: Action, options?: DispatchOptions, async = false): any {
        let records = handlerRegistry.get(action.type)
        if (records) {
            for (const record of records) {
                if (record.context?.accept?.(options?.discriminator) ?? true) {
                    const result = intercept(action, options, async, () =>
                        assert(record.handler(action, record.context), action, async)
                    )
                    if (result && !options?.multiDispatch) return result
                }
            }
        } else {
            console.warn(`no handler defined for action "${action.type}"`)
        }
        return {}
    }

    function dispatchAsyncAction(action: Action, options?: DispatchOptions): any {
        return dispatchAction(action, options, true)
    }

    function intercept(action: Action, options: DispatchOptions, async: boolean, next: () => any) {
        let records = interceptorRegistry.get(action.type)

        if (records) {
            let index = 0
            const _next = () => {
                const record = records[index++]
                if (record && (record.context?.accept?.(options?.discriminator) ?? true)) {
                    return assert(record.handler(action, record.context, _next), action, async)
                }
                return next()
            }
            return _next()
        }
        return next()
    }

    return {
        addActionHandler,
        removeActionHandler,
        dispatchAction,
        dispatchAsyncAction
    }
}

function assert(result: any, action: Action, async: boolean) {
    if (!result) return result

    if (async && typeof result.then !== 'function')
        throw new Error(
            `handler or interceptor for action "${action.type}" returned a Result. Use dispatchAction instead`
        )
    if (!async && typeof result.then === 'function')
        throw new Error(
            `handler or interceptor for action "${action.type}" returned a Promise. Use dispatchAsyncAction instead`
        )
    return result
}
