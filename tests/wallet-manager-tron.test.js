import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const getChainParametersMock = jest.fn()

jest.unstable_mockModule('tronweb', () => {
  const RealTronWeb = jest.requireActual('tronweb')
  const MockTronWeb = jest.fn().mockImplementation((options) => {
    const provider = new RealTronWeb(options)

    provider.trx.getChainParameters = getChainParametersMock

    return provider
  })
  Object.assign(MockTronWeb, RealTronWeb)
  MockTronWeb.address = RealTronWeb.address
  return { default: MockTronWeb }
})

const { default: WalletManagerTron, WalletAccountTron } = await import('../index.js')

describe('WalletManagerTron', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerTron(SEED_PHRASE, {
      provider: 'https://tron.web.provider/'
    })
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
      const DUMMY_CHAIN_PARAMETERS = [
        { key: 'getTransactionFee', value: 1_000 }
      ]

      getChainParametersMock.mockResolvedValue(DUMMY_CHAIN_PARAMETERS)

      const feeRates = await wallet.getFeeRates()

      expect(getChainParametersMock).toHaveBeenCalled()
      expect(feeRates.normal).toBe(1_100n)
      expect(feeRates.fast).toBe(2_000n)
    })

    test('should throw if the wallet is not connected to tron web', async () => {
      const disconnectedWallet = new WalletManagerTron(SEED_PHRASE)
      await expect(disconnectedWallet.getFeeRates())
        .rejects.toThrow('The wallet must be connected to tron web to get fee rates.')
    })
  })
})
