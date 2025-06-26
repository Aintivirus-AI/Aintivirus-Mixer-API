export const MIXER_IDL = {
    "version": "0.1.0",
    "name": "aintivirus_mixer",
    "instructions": [
        {
            "name": "initialize",
            "accounts": [
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "escrowVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVaultForSol",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mint",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "feeCollector",
                    "type": "publicKey"
                },
                {
                    "name": "feeCollectorAta",
                    "type": "publicKey"
                }
            ]
        },
        {
            "name": "chargeTokenEscrow",
            "accounts": [
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "from",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "escrowVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVaultForSol",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "Token mint."
                    ]
                }
            ],
            "args": [
                {
                    "name": "depositAmount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "chargeSolEscrow",
            "accounts": [
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "from",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "escrowVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVaultForSol",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "Token mint."
                    ]
                }
            ],
            "args": [
                {
                    "name": "depositAmount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "deposit",
            "accounts": [
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "from",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "fromAta",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "escrowVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVaultForSol",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "Token mint."
                    ]
                }
            ],
            "args": [
                {
                    "name": "mode",
                    "type": "u8"
                },
                {
                    "name": "depositAmount",
                    "type": "u64"
                },
                {
                    "name": "commitment",
                    "type": {
                        "array": [
                            "u8",
                            32
                        ]
                    }
                }
            ]
        },
        {
            "name": "registerEthSolCommitment",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "commitment",
                    "type": {
                        "array": [
                            "u8",
                            32
                        ]
                    }
                }
            ]
        },
        {
            "name": "withdraw",
            "accounts": [
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "to",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "toAta",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "escrowVaultForSol",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "feeCollector",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "feeCollectorAta",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "mint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "Token mint."
                    ]
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "instructionData",
                    "type": "bytes"
                }
            ]
        },
        {
            "name": "validateCommitment",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "commitment",
                    "type": {
                        "array": [
                            "u8",
                            32
                        ]
                    }
                }
            ]
        },
        {
            "name": "setFeeCollector",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "feeCollector",
                    "type": "publicKey"
                },
                {
                    "name": "feeCollectorAta",
                    "type": "publicKey"
                }
            ]
        },
        {
            "name": "setRefund",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "refund",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "setFee",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "fee",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "setMinSolDeposit",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "minSolDeposit",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "setMinTokenDeposit",
            "accounts": [
                {
                    "name": "authority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mixStorage",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "minTokenDeposit",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "verifyProofTest",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "instructionData",
                    "type": "bytes"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "MixStorage",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "depositCommitmentsNullifierHashes",
                        "type": {
                            "vec": {
                                "array": [
                                    "u8",
                                    32
                                ]
                            }
                        }
                    },
                    {
                        "name": "withdrawCommitments",
                        "type": {
                            "vec": {
                                "array": [
                                    "u8",
                                    32
                                ]
                            }
                        }
                    },
                    {
                        "name": "maintainer",
                        "type": "publicKey"
                    },
                    {
                        "name": "minSolDeposit",
                        "type": "u64"
                    },
                    {
                        "name": "minTokenDeposit",
                        "type": "u64"
                    },
                    {
                        "name": "feeCollector",
                        "type": "publicKey"
                    },
                    {
                        "name": "feeCollectorAta",
                        "type": "publicKey"
                    },
                    {
                        "name": "refund",
                        "type": "u64"
                    },
                    {
                        "name": "fee",
                        "type": "u64"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "InvalidMinimumDepositAmount",
            "msg": "Invalid deposit amount. Deposit amount under the mininum allowed"
        },
        {
            "code": 6001,
            "name": "NeedMaintainerRole",
            "msg": "Need Maintainer Role for this action"
        },
        {
            "code": 6002,
            "name": "VerificationFailed",
            "msg": "Proof verification failed"
        },
        {
            "code": 6003,
            "name": "InvalidProof",
            "msg": "Invalid proof"
        },
        {
            "code": 6004,
            "name": "InvalidMode",
            "msg": "Invalid mixing mode"
        },
        {
            "code": 6005,
            "name": "CommitmentNotFound",
            "msg": "Commitment not found"
        },
        {
            "code": 6006,
            "name": "CommitmentAlreadySubmitted",
            "msg": "Commitment already submitted"
        },
        {
            "code": 6007,
            "name": "NullifierHashAlreadyUsed",
            "msg": "Nullifier hash already used"
        },
        {
            "code": 6008,
            "name": "FailedToParsePublicInputs",
            "msg": "Failed to parse public inputs"
        },
        {
            "code": 6009,
            "name": "InvalidEscrowVault",
            "msg": "Invalid escrow vault account"
        }
    ]
}