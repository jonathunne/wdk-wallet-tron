/** @typedef {import('@tetherto/wdk-wallet').DisposalError} DisposalError */
/** @typedef {import('@tetherto/wdk-wallet').UnsupportedOperationError} UnsupportedOperationError */
/** @typedef {import('tronweb').Types.Transaction} Transaction */
/** @typedef {import('tronweb').Types.SignedTransaction} SignedTransaction */
/**
 * Interface for Tron signers.
 *
 * @interface
 */
export interface ISignerTron extends ISigner {
    /**
     * Derive a child signer using a relative path (e.g., "0'/0/0").
     *
     * @param {string} path - The relative derivation path.
     * @returns {Promise<ISignerTron>} The derived signer.
     * @throws {UnsupportedOperationError} If the signer does not support account derivation.
     * @throws {ValueError} If the path is not valid.
     * @throws {DisposalError} If the signer has been disposed.
     */
    derive(path: string): Promise<ISignerTron>;
    /**
     * Signs a transaction.
     *
     * @param {Transaction} unsignedTx - The unsigned tron web transaction.
     * @returns {Promise<SignedTransaction>} The signed transaction.
     * @throws {ValueError} If the transaction id is not a 32-byte hex string.
     * @throws {DisposalError} If the signer has been disposed.
     */
    signTransaction(unsignedTx: Transaction): Promise<SignedTransaction>;
}
export type DisposalError = import("@tetherto/wdk-wallet").DisposalError;
export type UnsupportedOperationError = import("@tetherto/wdk-wallet").UnsupportedOperationError;
export type Transaction = import("tronweb").Types.Transaction;
export type SignedTransaction = import("tronweb").Types.SignedTransaction;
import { ISigner } from '@tetherto/wdk-wallet';
