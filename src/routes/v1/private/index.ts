import Hapi from '@hapi/hapi'
import Joi from '@hapi/joi'
import { DataController } from '../../../controller'
import { ResponseUtil } from '../../../utils'
import { METHOD, VERSION, ENDPOINT } from '../../../constant'

const PRIVATE_ROUTER: Hapi.ServerRoute[] = [
    /**
     * GET endpoints
     */
    {
        method: METHOD.GET,
        path: VERSION.V1 + ENDPOINT.GET.ZERO_HASHES,
        options: {
            handler: async (request, reply) => {
                try {
                    const response = await DataController.zeroHashes(request.query)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    throw error
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                query: Joi.object({
                    tree_depth: Joi.number().integer().min(1).max(100).optional(),
                    zero_value: Joi.number().integer().optional()
                })
            },
            description: 'API for check or compute zero hashes with Poseidon hasher',
            notes: 'Hit the endpoint to get zero hash list',
            tags: ['baseurl', 'default', 'check zero hash list']
        }
    },
]

export default PRIVATE_ROUTER