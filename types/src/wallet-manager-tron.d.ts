export default class WalletManagerTron extends WalletManager<ISignerTron> {
    /**
     * Multiplier for normal fee rate calculations (in %).
     *
     * @protected
     * @type {bigint}
     */
    protected static _FEE_RATE_NORMAL_MULTIPLIER: bigint;
    /**
     * Multiplier for fast fee rate calculations (in %).
     *
     * @protected
     * @type {bigint}
     */
    protected static _FEE_RATE_FAST_MULTIPLIER: bigint;
    /**
     * Creates a new wallet manager for the tron blockchain from a default signer.
     *
     * The default signer must be derivable (it must be able to derive child accounts);
     * non-derivable signers (e.g. private-key signers) are not allowed as the default but
     * may be registered by name via {@link addSigner}.
     * **Warning:** the signer is kept exactly as given, not cloned. Disposing it directly breaks
     * further account derivation, and the manager never disposes a signer you supplied.
     *
     * @overload
     * @param {ISignerTron} signer - The default root signer.
     * @param {TronWalletConfig} [config] - The configuration object.
     * @throws {InvalidSignerError} If the default signer does not support account derivation.
     */
    constructor(signer: ISignerTron, config?: TronWalletConfig);
    /**
     * Creates a new wallet manager for the tron blockchain from a seed.
     *
     * The manager wraps the seed in a {@link SeedSignerTron} at "m/44'/195'", owns it, and wipes it on
     * {@link dispose}. The seed itself is not kept.
     *
     * @overload
     * @param {string | Uint8Array} seed - A BIP-39 mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {TronWalletConfig} [config] - The configuration object.
     * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
     */
    constructor(seed: string | Uint8Array, config?: TronWalletConfig);
    /**
     * Returns the wallet account at a specific index (see BIP-44).
     *
     * **Warning:** derivation is relative to the signer's own path. If the signer sits at a leaf
     * (e.g. m/44'/195'/0'/0/0), getAccount(1) derives m/44'/195'/0'/0/0/0'/0/1, probably not what
     * you want; use a signer at the coin-type node (m/44'/195'), which is where
     * `SeedSignerTron` sits by default.
     *
     * @example
     * // Returns the account with derivation path m/44'/195'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @overload
     * @param {number} [index] - The index of the account to get (default: 0).
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountTron>} The account.
     * @throws {ValueError} If the index is not an integer between 0 and 2^31 - 1.
     * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the signer has been disposed.
     * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
     */
    getAccount(index?: number, options?: {
        signerName?: string;
    }): Promise<WalletAccountTron>;
    /**
     * Returns the wallet account backed by a registered signer, without further derivation.
     * Use it for non-derivable signers, such as {@link PrivateKeySignerTron}.
     *
     * @example
     * wallet.addSigner('treasury', new PrivateKeySignerTron(privateKey))
     * const account = await wallet.getAccount('treasury');
     * @overload
     * @param {string} signerName - The signer name registered via {@link addSigner}.
     * @returns {Promise<WalletAccountTron>} The account.
     * @throws {NoSuchElementError} If no signer is registered with the given name.
     * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
     */
    getAccount(signerName: string): Promise<WalletAccountTron>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/195'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountTron>} The account.
     * @throws {ValueError} If the path is not valid.
     * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the signer has been disposed.
     */
    getAccountByPath(path: string, options?: {
        signerName?: string;
    }): Promise<WalletAccountTron>;
    /**
     * Disposes all wallet accounts, clearing secret material from memory, and the default signer if the manager built it
     * from a seed. A signer supplied by the caller, as the default or via {@link addSigner}, is never disposed. Calling it
     * again has no effect.
     */
    dispose(): void;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<FeeRates>} The fee rates (in suns).
     * @throws {ProviderRequiredError} If the wallet is not connected to tron web.
     */
    getFeeRates(): Promise<FeeRates>;
    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    protected _shouldWipeDefaultSignerOnDisposal: boolean;
    /**
     * The tron wallet configuration.
     *
     * @protected
     * @type {TronWalletConfig}
     */
    protected _config: TronWalletConfig;
    /**
     * The tron web client.
     *
     * @protected
     * @type {ReturnType<typeof WalletAccountTron.initializeProvider>}
     */
    protected _tronWeb: ReturnType<typeof WalletAccountTron.initializeProvider>;
    /** @private */
    private _accountConfig;
}
export type FeeRates = import("@tetherto/wdk-wallet").FeeRates;
export type TronWalletConfig = import("./wallet-account-tron.js").TronWalletConfig;
export type ISignerTron = import("./signers/signer-tron.js").ISignerTron;
export type PrivateKeySignerTron = import("./signers/private-key-signer-tron.js").default;
import WalletManager from '@tetherto/wdk-wallet';
import WalletAccountTron from './wallet-account-tron.js';
