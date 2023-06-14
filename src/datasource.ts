import { derived, type Readable } from '@splitflow/core/stores'
import { merge } from '@splitflow/core/utils/object'

export interface Resource {
    type: string
}

export interface FetchOptions {
    multiFetch: boolean
}

export interface Datasource {
    addResourceHandler: (type: string, handler: (resource: Resource) => Readable<unknown>) => void
    removeResourceHandler: (
        type: string,
        handler: (resource: Resource) => Readable<unknown>
    ) => void
    fetchResource: (resource: Resource, options?: FetchOptions) => Readable<unknown>
}

export function createDatasource(): Datasource {
    const registry = new Map<string, Array<(resource: Resource) => Readable<unknown>>>()

    function addResourceHandler(type: string, handler: (resource: Resource) => Readable<unknown>) {
        let handlers = registry.get(type)
        if (!handlers) {
            handlers = new Array<(resource: Resource) => Readable<unknown>>()
            registry.set(type, handlers)
        }
        if (handlers.indexOf(handler) < 0) {
            handlers.unshift(handler)
        }
    }

    function removeResourceHandler(
        type: string,
        handler: (resource: Resource) => Readable<unknown>
    ) {
        let handlers = registry.get(type)
        if (handlers) {
            const index = handlers.indexOf(handler)
            handlers.splice(index, 1)
        }
    }

    function fetchResource(resource: Resource, options?: FetchOptions): Readable<unknown> {
        let handlers = registry.get(resource.type)
        if (handlers) {
            const readables: Readable<unknown>[] = []

            for (const handler of handlers) {
                const readable = handler(resource)
                if (readable && options?.multiFetch) {
                    readables.push(readable)
                    continue
                }
                if (readable) {
                    return readable
                }
            }

            if (readables.length > 0) {
                return mergeReadables(readables)
            }
        } else {
            console.warn(`no handler defined for resource "${resource.type}"`)
        }

        return undefined
    }

    return {
        addResourceHandler,
        removeResourceHandler,
        fetchResource
    }
}

function mergeReadables(readables: Readable<unknown>[]) {
    if (readables.length === 1) return readables[0]

    return derived(readables, (values) => {
        return values.reduce(merge, {})
    })
}
