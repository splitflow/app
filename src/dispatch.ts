
export interface Action {
    type: string
}

export interface Result {
}

export interface DispatchOptions {
    multiDispatch: boolean
}

export interface Dispatcher {
    addActionHandler: (type: string, handler: (action: Action) => Result) => void;
    removeActionHandler: (type: string, handler: (action: Action) => Result) => void;
    dispatchAction: (action: Action, options?: DispatchOptions) => Result;
}

export function createDisatcher(): Dispatcher {
    const registry = new Map<string, Array<(action: Action) => Result>>()

    function addActionHandler(type: string, handler: (action: Action) => Result) {
        let handlers = registry.get(type)
        if (!handlers) {
            handlers = new Array<() => boolean>()
            registry.set(type, handlers)
        }
        if (handlers.indexOf(handler) < 0) {
            handlers.unshift(handler)
        }
    }

    function removeActionHandler(type: string, handler: (action: Action) => Result) {
        let handlers = registry.get(type)
        if (handlers) {
            const index = handlers.indexOf(handler)
            handlers.splice(index, 1)
        }
    }

    function dispatchAction(action: Action, options?: DispatchOptions): Result {
        let handlers = registry.get(action.type)
        if (handlers) {
            for (const handler of handlers) {
                const result = handler(action)
                if (result && !options?.multiDispatch) return result
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