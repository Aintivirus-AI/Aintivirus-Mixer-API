/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IPoseidon,
  IPoseidonInterface,
} from "../../MerkleTreeWithHistory.sol/IPoseidon";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256[2]",
        name: "inputs",
        type: "uint256[2]",
      },
    ],
    name: "poseidon",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;

export class IPoseidon__factory {
  static readonly abi = _abi;
  static createInterface(): IPoseidonInterface {
    return new Interface(_abi) as IPoseidonInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): IPoseidon {
    return new Contract(address, _abi, runner) as unknown as IPoseidon;
  }
}
