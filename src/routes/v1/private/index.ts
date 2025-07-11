import Hapi from '@hapi/hapi'
import Joi from '@hapi/joi'
import { DataController } from '../../../controller'
import { MixerController } from '../../../controller'
import { ResponseUtil } from '../../../utils'
import { METHOD, VERSION, ENDPOINT } from '../../../constant'
import { CORS_CONFIG } from '../../../constant/app'

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
                catch (error) {
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
            }
        }
    },
    {
        method: METHOD.GET,
        path: VERSION.V1 + ENDPOINT.GET.SOL_MIXER_STORAGE_DATA,
        options: {
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.getSolMixerStorageData()

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    throw error
                }
            },
            validate: {
                failAction: ResponseUtil.failAction
            }
        }
    },
    /**
     * POST endpoints
     */
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_MAINTAINER,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setMaintainer(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    maintainer: Joi.string().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_FEECOLLECTOR,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setFeeCollector(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    feeCollector: Joi.string().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_REFUND,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setRefund(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    refund: Joi.number().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_FEE,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setFee(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    fee: Joi.number().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_MINDEPOSIT,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setMinSolDepositAmount(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    minAmount: Joi.number().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SET_SOL_MINTOKENDEPOSIT,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.setMinTokenDepositAmount(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    minAmount: Joi.number().required(),
                    signer: Joi.string().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.SEND_TRANSACTION,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await DataController.sendTransaction(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    transaction: Joi.object().required(),
                })
            }
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.GET_LATEST_BLOCK,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await DataController.getLatestBlock()

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch (error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction
            }
        }
    },
]

export default PRIVATE_ROUTER