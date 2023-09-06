interface Record {
    handler: (action: Action, context: any) => Result
    context: any
}

export interface Action {
    type: string
}

export interface Result {}

export interface DispatchOptions {
    multiDispatch?: boolean
    discriminator?: unknown
}

export interface Dispatcher {
    addActionHandler(type: string, handler: (action: Action) => Result): void
    addActionHandler<T>(
        type: string,
        handler: (action: Action, context: T) => Result,
        context: T
    ): void
    removeActionHandler<T>(type: string, handler: (action: Action) => Result): void
    removeActionHandler<T>(
        type: string,
        handler: (action: Action, context: T) => Result,
        context: T
    ): void
    dispatchAction(action: Action, options?: DispatchOptions): Result
}

export function createDisatcher(): Dispatcher {
    const registry = new Map<string, Array<Record>>()

    function addActionHandler(
        type: string,
        handler: (action: Action, context?: any) => Result,
        context?: any
    ) {
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
        handler: (action: Action, context?: any) => Result,
        context?: any
    ) {
        let records = registry.get(type)
        if (records) {
            const index = records.findIndex((r) => r.handler === handler && r.context === context)
            records.splice(index, 1)
        }
    }

    function dispatchAction(action: Action, options?: DispatchOptions): Result {
        let records = registry.get(action.type)
        if (records) {
            for (const record of records) {
                if (record.context?.accept?.(options?.discriminator) ?? true) {
                    const result = record.handler(action, record.context)
                    if (result && !options?.multiDispatch) return result
                }
            }
        } else {
            console.warn(`no handler defined for action "${action.type}"`)
        }
        return {}
    }

    return {
        addActionHandler,
        removeActionHandler,
        dispatchAction
    }
}
