import { ActionEndpoint, Result, actionRequestX, getResult } from '@splitflow/lib'
import {
    type GetAccessTokenAction,
    GetAccessTokenEndpoint,
    GetAccessTokenResult
} from '@splitflow/lib/auth'
import { Action } from './dispatch'

export interface Gateway {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

export interface GatewayOptions {
    apiKey?: string
    refreshToken?: string
}

export function createGateway(options: GatewayOptions = {}, _fetch = fetch): Gateway {
    let accessToken: string

    return {
        async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            let request = input instanceof Request ? input : new Request(input)
            const authorization = request.headers.get('authorization')

            if (authorization === 'bearer TOKEN') {
                if (options?.apiKey) {
                    // authenticate request using API key
                    const { apiKey } = options
                    request.headers.set('authorization', `bearer ${apiKey}`)
                } else {
                    // authenticate request using access token
                    if (!accessToken) {
                        const { refreshToken } = options
                        const action: GetAccessTokenAction = {
                            type: 'get-access-token',
                            refreshToken
                        }
                        const response = await _fetch(
                            actionRequestX(action, GetAccessTokenEndpoint)
                        )
                        const result = await getResult<GetAccessTokenResult>(response)
                        accessToken = result.accessToken
                    }

                    request.headers.set('authorization', `bearer ${accessToken}`)
                }
            }

            if (false) {
                // use dev endpoint
                const url = new URL(request.url)
                request = new Request(getDevURL(url), request)
            }

            const response = await _fetch(request, init)
            if (response.headers.has('x-discard-authorization')) {
                accessToken = undefined
            }
            return response
        }
    }
}

// handler instance must be the same when calling addActionHandler and removeActionHandler
// so we cache it
const bridgeRegistry = new Map<
    ActionEndpoint<Action>,
    (action: Action, context: { gateway: Gateway }) => Promise<Result>
>()

export function bridge<A extends Action, R extends Result>(endpoint: ActionEndpoint<A>) {
    let handler = bridgeRegistry.get(endpoint) as (
        action: A,
        context: { gateway: Gateway }
    ) => Promise<R>

    if (!handler) {
        handler = (action: A, context: { gateway: Gateway }) => {
            const response = context.gateway.fetch(actionRequestX(action, endpoint))
            return getResult<R>(response)
        }
        bridgeRegistry.set(endpoint, handler)
    }
    return handler
}

function getDevURL(url: URL) {
    const [subdomain] = url.hostname.split('.')
    const pathname = url.pathname

    let port
    switch (subdomain) {
        case 'account':
            port = 49724
            break
        case 'auth':
            port = 123
            break
        case 'design':
            port = 58032
            break
        case 'editor':
            port = 58043
            break
        case 'orca':
            port = 49707
            break
        case 'project':
            port = 49724
            break
    }

    return new URL(`http://localhost:${port}${pathname}`)
}
