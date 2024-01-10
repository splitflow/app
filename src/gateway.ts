import { actionRequestX, getResult } from '@splitflow/lib'
import {
    type GetAccessTokenAction,
    GetAccessTokenEndpoint,
    GetAccessTokenResult
} from '@splitflow/lib/auth'

export interface Gateway {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

export function createGateway(_fetch = fetch): Gateway {
    let accessToken: string

    return {
        async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            let request = input instanceof Request ? input : new Request(input)
            const authorization = request.headers.get('authorization')

            if (authorization === 'bearer TOKEN') {
                if (!accessToken) {
                    const action: GetAccessTokenAction = { type: 'get-access-token' }
                    const response = await fetch(actionRequestX(action, GetAccessTokenEndpoint))
                    const result = await getResult<GetAccessTokenResult>(response)
                    accessToken = result.accessToken
                }

                request.headers.set('authorization', `bearer ${accessToken}`)
            }

            if (false) {
                // use dev endpoint
                const url = new URL(request.url)
                request = new Request(getDevURL(url), request)
            }

            return _fetch(request, init)
        }
    }
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
