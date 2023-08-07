import { derived, type Readable } from '@splitflow/core/stores'
import { merge } from '@splitflow/core/utils'

export interface Resource {
    name: string
}

export interface FetchOptions {
    multiFetch: boolean
}

export interface Datasource {
    addResourceHandler: (name: string, handler: (resource: Resource) => Readable<unknown>) => void
    removeResourceHandler: (
        name: string,
        handler: (resource: Resource) => Readable<unknown>
    ) => void
    fetchResource: <T>(resource: Resource, options?: FetchOptions) => Readable<T>
}

export function createDatasource(): Datasource {
    const registry = new Map<string, Array<(resource: Resource) => Readable<unknown>>>()

    function addResourceHandler(name: string, handler: (resource: Resource) => Readable<unknown>) {
        let handlers = registry.get(name)
        if (!handlers) {
            handlers = new Array<(resource: Resource) => Readable<unknown>>()
            registry.set(name, handlers)
        }
        if (handlers.indexOf(handler) < 0) {
            handlers.unshift(handler)
        }
    }

    function removeResourceHandler(
        name: string,
        handler: (resource: Resource) => Readable<unknown>
    ) {
        let handlers = registry.get(name)
        if (handlers) {
            const index = handlers.indexOf(handler)
            handlers.splice(index, 1)
        }
    }

    function fetchResource<T>(resource: Resource, options?: FetchOptions): Readable<T> {
        let handlers = registry.get(resource.name)
        if (handlers) {
            const readables: Readable<T>[] = []

            for (const handler of handlers) {
                const readable = handler(resource) as Readable<T>
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
            console.warn(`no handler defined for resource "${resource.name}"`)
        }

        return undefined
    }

    return {
        addResourceHandler,
        removeResourceHandler,
        fetchResource
    }
}

function mergeReadables<T>(readables: Readable<T>[]) {
    if (readables.length === 1) return readables[0]

    return derived(readables, (values) => {
        return values.reduce(merge)
    })
}
