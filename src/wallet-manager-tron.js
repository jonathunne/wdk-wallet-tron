// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import WalletManager, { DisposalError, InvalidSignerError, ProviderRequiredError, ValueError } from '@tetherto/wdk-wallet'

import WalletAccountTron from './wallet-account-tron.js'
import SeedSignerTron from './signers/seed-signer-tron.js'

/** @typedef {import('@tetherto/wdk-wallet').FeeRates} FeeRates */
/** @typedef {import('@tetherto/wdk-wallet').NoSuchElementError} NoSuchElementError */

/** @typedef {import('./wallet-account-tron.js').TronWalletConfig} TronWalletConfig */

/** @typedef {import('./signers/signer-tron.js').ISignerTron} ISignerTron */
/** @typedef {import('./signers/private-key-signer-tron.js').default} PrivateKeySignerTron */

/** @extends {WalletManager<ISignerTron>} */
export default class WalletManagerTron extends WalletManager {
  /**
   * Multiplier for normal fee rate calculations (in %).
   *
   * @protected
   * @type {bigint}
   */
  static _FEE_RATE_NORMAL_MULTIPLIER = 110n

  /**
   * Multiplier for fast fee rate calculations (in %).
   *
   * @protected
   * @type {bigint}
   */
  static _FEE_RATE_FAST_MULTIPLIER = 200n

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
  constructor (seedOrSigner, config = {}) {
    const isSeed = typeof seedOrSigner === 'string' || seedOrSigner instanceof Uint8Array

    super(isSeed ? new SeedSignerTron(seedOrSigner) : seedOrSigner, config)

    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    this._shouldWipeDefaultSignerOnDisposal = isSeed

    /**
     * The tron wallet configuration.
     *
     * @protected
     * @type {TronWalletConfig}
     */
    this._config = config

    /**
     * The tron web client.
     *
     * @protected
     * @type {ReturnType<typeof WalletAccountTron.initializeProvider>}
     */
    this._tronWeb = WalletAccountTron.initializeProvider(config)
  }

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
  async getAccount (indexOrSignerName = 0, options = {}) {
    if (typeof indexOrSignerName === 'string') {
      const signerName = indexOrSignerName

      if (this.disposed) {
        throw new DisposalError('The wallet manager has been disposed.')
      }

      if (!this._accounts[signerName]) {
        const signer = this.getSigner(signerName)

        if (signer.disposed) {
          throw new DisposalError('The given signer has been disposed.')
        }

        this._accounts[signerName] = new WalletAccountTron(signer, this._accountConfig())
      }

      return this._accounts[signerName]
    }

    if (!Number.isInteger(indexOrSignerName) || indexOrSignerName < 0 || indexOrSignerName >= 2 ** 31) {
      throw new ValueError('The index must be an integer between 0 and 2^31 - 1.')
    }

    return await this.getAccountByPath(`0'/0/${indexOrSignerName}`, options)
  }

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
  async getAccountByPath (path, options = {}) {
    if (this.disposed) {
      throw new DisposalError('The wallet manager has been disposed.')
    }

    const { signerName } = options
    const key = signerName === undefined ? path : `${signerName}:${path}`

    if (!this._accounts[key]) {
      const rootSigner = this.getSigner(signerName)

      if (!rootSigner.isDerivable) {
        throw new InvalidSignerError('The signer does not support account derivation.')
      }

      const signer = await rootSigner.derive(path)

      if (this._accounts[key]) {
        signer.dispose()
      } else {
        try {
          this._accounts[key] = new WalletAccountTron(signer, { ...this._accountConfig(), shouldWipeSignerOnDisposal: true })
        } catch (error) {
          signer.dispose()

          throw error
        }
      }
    }

    return this._accounts[key]
  }

  /**
   * Disposes all wallet accounts, clearing secret material from memory, and the default signer if the manager built it
   * from a seed. A signer supplied by the caller, as the default or via {@link addSigner}, is never disposed. Calling it
   * again has no effect.
   */
  dispose () {
    if (this.disposed) {
      return
    }

    if (this._shouldWipeDefaultSignerOnDisposal) {
      this._defaultSigner.dispose()
    }

    super.dispose()
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<FeeRates>} The fee rates (in suns).
   * @throws {ProviderRequiredError} If the wallet is not connected to tron web.
   */
  async getFeeRates () {
    if (!this._tronWeb) {
      throw new ProviderRequiredError('The wallet must be connected to tron web to get fee rates.')
    }

    const chainParameters = await this._tronWeb.trx.getChainParameters()
    const getTransactionFee = chainParameters.find(({ key }) => key === 'getTransactionFee')
    const fee = BigInt(getTransactionFee.value)

    return {
      normal: (fee * WalletManagerTron._FEE_RATE_NORMAL_MULTIPLIER) / 100n,
      fast: (fee * WalletManagerTron._FEE_RATE_FAST_MULTIPLIER) / 100n
    }
  }

  /** @private */
  _accountConfig () {
    return { ...this._config, provider: this._tronWeb }
  }
}
