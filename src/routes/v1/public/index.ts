// ** import external libraries
import Hapi from '@hapi/hapi'
import Joi from '@hapi/joi'

// ** import controller
import { MixerController } from '../../../controller'

// ** import helper
import { GatewayHelper } from '../../../helper'

// ** import custom utilities
import { ResponseUtil } from '../../../utils'

// ** import app constants
import { METHOD, VERSION, ENDPOINT } from '../../../constant'
import { CORS_CONFIG } from '../../../constant/app'

const PUBLIC_ROUTER: Hapi.ServerRoute[] = [
    /**
     * GET endpoints
     */
    {
        method: METHOD.GET,
        path: VERSION.V1 + ENDPOINT.GET.DEFAULT,
        options: {
            handler: (request, reply) => {
                return reply.view('index')
            },
            description: 'API base default public endpoints (GET)',
            notes: 'Hit the endpoint to check if server is alive',
            tags: ['baseurl', 'default', 'check api status']
        }
    },
    {
        method: METHOD.GET,
        path: VERSION.V1 + ENDPOINT.GET.IP,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await GatewayHelper.getIpDetail(request.info.remoteAddress)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    throw error
                }
            },
            description: 'API for checking IP address information',
            notes: 'Hit the endpoint to get remote IP detail',
            tags: ['baseurl', 'default', 'check ip detail']
        }
    },
    /**
     * POST endpoints
     */
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.DEPOSIT_ETH,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.depositETH(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    amount: Joi.string().required(),
                    currency: Joi.string().required(),
                    sender: Joi.string().required(),
                })
            },
            description: 'Ethereum deposit request',
            notes: 'Hit the endpoint with payload to deposit Ethereum',
            tags: ['/deposit-eth', 'deposit', 'ethereum']
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.DEPOSIT_SOL,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.depositSOL(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    amount: Joi.number().required(),
                    currency: Joi.string().required(),
                    sender: Joi.string().required(),
                })
            },
            description: 'Solana deposit request',
            notes: 'Hit the endpoint with payload to deposit Solana',
            tags: ['/deposit-sol', 'deposit', 'solana']
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.VALIDATE_ETH_DEPOSIT,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.validateETHDeposit(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    sessionId: Joi.string().required(),
                    txHash: Joi.string().required(),
                })
            },
            description: 'Ethereum deposit validation request',
            notes: 'Hit the endpoint with transaction hash to validate deposit',
            tags: ['/validate-eth-deposit', 'ethereum', 'validate']
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.VALIDATE_SOL_DEPOSIT,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.validateSOLDeposit(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    console.error(error)
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    sessionId: Joi.string().required(),
                    txHash: Joi.string().required(),
                })
            },
            description: 'Solana deposit validation request',
            notes: 'Hit the endpoint with transaction hash to validate deposit',
            tags: ['/validate-sol-deposit', 'solana', 'validate']
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.WITHDRAW_ETH,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.withdrawETH(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    note: Joi.string().required(),
                    receiver: Joi.string().required(),
                })
            },
            description: 'Ethereum withdrawal request for Solana deposit',
            notes: 'Hit the endpoint with secret note to make Ethereum withdrawal reuqest',
            tags: ['/withdraw-eth', 'ethereum', 'withdraw']
        }
    },
    {
        method: METHOD.POST,
        path: VERSION.V1 + ENDPOINT.POST.WITHDRAW_SOL,
        options: {
            cors: CORS_CONFIG,
            handler: async (request, reply) => {
                try {
                    const response = await MixerController.withdrawSOL(request.payload)

                    return ResponseUtil.sendResponse(response, reply)
                }
                catch(error) {
                    return Object(error)
                }
            },
            validate: {
                failAction: ResponseUtil.failAction,
                payload: Joi.object({
                    note: Joi.string().required(),
                    receiver: Joi.string().required()
                })
            },
            description: 'Solana withdrawal request for Ethereum deposits',
            notes: 'Hit the endpoint with secret note to make Solana withdrawal request',
            tags: ['/withdraw-sol', 'solana', 'withdraw']
        }
    }
]

export default PUBLIC_ROUTER