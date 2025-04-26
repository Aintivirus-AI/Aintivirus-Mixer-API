
# AintiVirus CryptoMixer – Mixer API

**Status:** 🚧 Under Construction

## Overview

The **AintiVirus CryptoMixer** backend API is designed to facilitate secure and private cryptocurrency mixing services. Built with [Hapi.js](https://hapi.dev/) and TypeScript, this API serves as the backbone for operations such as generating zero-knowledge proofs (ZKPs), verifying proofs, and managing mixer transactions. The architecture emphasizes modularity, scalability, and security, making it suitable for production environments.

---

## Features

- **Zero-Knowledge Proof Generation:** Utilizes zk-SNARKs to create proofs that validate transactions without revealing sensitive information.
- **Proof Verification:** Implements off-chain verification to ensure the integrity and validity of generated proofs.
- **Modular Design:** Organized codebase with clear separation of concerns, enhancing maintainability and scalability.
- **TypeScript Integration:** Leverages TypeScript for type safety and improved developer experience.

---

## Project Structure

```
mixer-api/
├── src/
│   ├── zksnark/
│   │   ├── mixer.wasm
│   │   ├── mixer_final.zkey
│   │   └── verification_key.json
├── .env.example
├── .gitignore
├── README.md
├── index.ts
├── nodemon.json
├── package.json
├── tsconfig.json
```

### Detailed Breakdown

- **`src/`**: Contains the source code and related assets.
  - **`zksnark/`**: Houses zero-knowledge proof artifacts:
    - `mixer.wasm`: WebAssembly module for proof generation.
    - `mixer_final.zkey`: Final proving key.
    - `verification_key.json`: Key used for proof verification.
- **`.env.example`**: Template for environment variables.
- **`.gitignore`**: Specifies files and directories to be ignored by Git.
- **`README.md`**: Project documentation.
- **`index.ts`**: Entry point of the application.
- **`nodemon.json`**: Configuration for Nodemon to auto-restart the server during development.
- **`package.json`**: Lists dependencies and scripts.
- **`tsconfig.json`**: TypeScript configuration file.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Aintivirus-AI/Aintivirus-Mixer-API.git
   cd mixer-api
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**

   - Copy the example environment file and modify it as needed:

     ```bash
     cp .env.example .env
     ```

   - Update the `.env` file with appropriate values.

### Running the Application

- **Development Mode:**

  ```bash
  npm run dev
  ```

  This will start the server with Nodemon, enabling automatic restarts on code changes.

- **Production Build:**

  ```bash
  npm run build
  ```

  Compiles the TypeScript code into JavaScript for production deployment.

---

## Usage

The API primarily focuses on zero-knowledge proof operations. Below is an overview of the core functionalities:

### 1. Generating a Zero-Knowledge Proof

**Function:** `createZkProof(currency: string, amount: BigInt | number | string)`

- **Parameters:**
  - `currency`: The cryptocurrency address.
  - `amount`: The amount to be mixed.

- **Process:**
  - Generates random `secret` and `nullifier` values.
  - Constructs the input object for proof generation.
  - Utilizes `snarkjs` to generate the proof and public signals.
  - Computes the `nullifierHash` for verification purposes.
  - Returns the proof, public signals, nullifier, nullifier hash, and calldata.

### 2. Verifying a Zero-Knowledge Proof

**Function:** `offchainVerify(zkData: any)`

- **Parameters:**
  - `zkData`: An object containing the proof, public signals, and nullifier.

- **Process:**
  - Loads the verification key from `verification_key.json`.
  - Uses `snarkjs` to verify the proof against the public signals.
  - Returns a boolean indicating the validity of the proof.

---

## Scripts

- **`npm run dev`**: Starts the development server with Nodemon.
- **`npm run build`**: Compiles the TypeScript code for production.

---

## Dependencies

- **[Hapi.js](https://hapi.dev/)**: A rich framework for building applications and services.
- **[TypeScript](https://www.typescriptlang.org/)**: A typed superset of JavaScript.
- **[snarkjs](https://github.com/iden3/snarkjs)**: JavaScript library for zk-SNARKs.
- **[ethers.js](https://docs.ethers.io/)**: Library for interacting with Ethereum.
- **[bs58](https://github.com/cryptocoinjs/bs58)**: Base58 encoding/decoding.

---

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- Inspired by the need for enhanced privacy in cryptocurrency transactions.
- Utilizes cutting-edge cryptographic techniques to ensure user anonymity.

---

## Cautions
- NodeJs version v20 or later is required.
- TypeScript version must be v4.5

Feel free to customize this README further to match any additional specifics or branding requirements for your project. 