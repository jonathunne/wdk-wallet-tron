import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import WalletManagerTron, { WalletAccountTron } from '../index.js'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

describe('WalletManagerTron', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerTron(SEED_PHRASE)
  })

  afterEach(() => {
    wallet.dispose()
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountTron)

      expect(account.path).toBe("m/44'/195'/0'/0/0")

      account.dispose()
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountTron)

      expect(account.path).toBe("m/44'/195'/0'/0/3")

      account.dispose()
    })

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1))
        .rejects.toThrow('invalid child index')
    })
  })

  describe('getAccountByPath', () => {
    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2/3")

      expect(account).toBeInstanceOf(WalletAccountTron)

      expect(account.path).toBe("m/44'/195'/1'/2/3")

      account.dispose()
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b/c"))
        .rejects.toThrow('invalid child index')
    })
  })

  describe('getFeeRates', () => {
    test('should return the correct fee rates', async () => {
      const DUMMY_FEE = 1000

      const mockTronWeb = {
        trx: {
          getChainParameters: jest.fn().mockResolvedValue([
            { key: 'getTransactionFee', value: DUMMY_FEE }
          ])
        }
      }

      wallet._tronWeb = mockTronWeb

      const feeRates = await wallet.getFeeRates()

      expect(mockTronWeb.trx.getChainParameters).toHaveBeenCalled()

      expect(feeRates.normal).toBe(1100n)

      expect(feeRates.fast).toBe(2000n)
    })

    test('should throw if the wallet is not connected to tron web', async () => {
      await expect(wallet.getFeeRates())
        .rejects.toThrow('The wallet must be connected to tron web to get fee rates.')
    })
  })
})
