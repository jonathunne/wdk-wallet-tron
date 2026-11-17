/**
 * Signer backed by a single raw secp256k1 private key (non-HD).
 *
 * Does not support HD derivation. Signs messages and transactions directly with the key.
 *
 * @implements {ISignerTron}
 */
export default class PrivateKeySignerTron implements ISignerTron {
    /**
     * Creates a new private key signer.
     *
     * The supplied key is copied: the signer keeps its own internal copy alive until {@link dispose}
     * zeroes it, and never wipes the supplied key, whose disposal remains the caller's responsibility.
     *
     * @param {string | Uint8Array} privateKey - The private key's hex string (with or without 0x) or bytes (32 bytes).
     * @throws {ValueError} If the key is not a valid secp256k1 private key.
     */
    constructor(privateKey: string | Uint8Array);
    /**
     * Whether the signer supports account derivation via {@link derive}.
     *
     * @type {false}
     */
    get isDerivable(): false;
    /**
     * The BIP 0032 derivation path, or null if the signer is not bound to a derivation position
     * (e.g. private-key signers).
     *
     * @type {null}
     */
    get path(): null;
    /**
     * True if the signer has been disposed.
     *
     * @type {boolean}
     */
    get disposed(): boolean;
    /**
     * The signer's key pair, or null if the signer does not allow retrieving key material (e.g. hardware
     * signers). A private-key signer always exposes its key pair; the private key is null once it is disposed.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Derive a child signer using a relative path (e.g., "0'/0/0").
     *
     * @param {string} path - The relative derivation path.
     * @returns {Promise<never>} The derived signer.
     * @throws {UnsupportedOperationError} If the signer does not support account derivation.
     */
    derive(path: string): Promise<never>;
    /**
     * Returns the signer's address.
     *
     * @returns {Promise<string>} The signer's address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     * @throws {DisposalError} If the signer has been disposed.
     */
    sign(message: string): Promise<string>;
    /**
     * Signs a transaction.
     *
     * @param {Transaction} unsignedTx - The unsigned tron web transaction.
     * @returns {Promise<SignedTransaction>} The signed transaction.
     * @throws {ValueError} If the transaction id is not a 32-byte hex string.
     * @throws {DisposalError} If the signer has been disposed.
     */
    signTransaction(unsignedTx: Transaction): Promise<SignedTransaction>;
    /**
     * Disposes the object along with all its data (cleaning up any sensitive field from memory): for a private-key signer,
     * its internal copy of the private key.
     */
    dispose(): void;
    /** @private */
    private _rawPrivateKey;
    /** @private */
    private _rawPublicKey;
    /** @private */
    private _address;
    /** @private */
    private _disposed;
    /** @private */
    private _guardDisposed;
}
export type ISignerTron = import("./signer-tron.js").ISignerTron;
export type KeyPair = import("@tetherto/wdk-wallet").KeyPair;
export type Transaction = import("tronweb").Types.Transaction;
export type SignedTransaction = import("tronweb").Types.SignedTransaction;
