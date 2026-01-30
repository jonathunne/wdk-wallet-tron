import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import * as bip39 from 'bip39'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const INVALID_SEED_PHRASE = 'invalid seed phrase'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)

const ACCOUNT = {
  index: 0,
  path: "m/44'/195'/0'/0/0",
  address: 'TXngH8bVadn9ZWtKBgjKQcqN1GsZ7A1jcb',
  keyPair: {
    privateKey: '5d5645db7db2a3b86435e3ec9b3b2cc670fccef5b6d5705e310b8ac2d8d37633',
    publicKey: '03ebdf0c06e1523a5931e7593e3ac231f5a123b898eb6c02af61aa83b32f8603b0'
  }
}

// Mocks
const sendTrxMock = jest.fn()
const sendRawTransactionMock = jest.fn()
const getAccountResourcesMock = jest.fn()
const triggerSmartContractMock = jest.fn()
const triggerConstantContractMock = jest.fn()
const getChainParametersMock = jest.fn()

jest.unstable_mockModule('tronweb', () => {
  const RealTronWeb = jest.requireActual('tronweb')
  const MockTronWeb = jest.fn().mockImplementation((options) => {
    const provider = new RealTronWeb(options)

    provider.trx.sendRawTransaction = sendRawTransactionMock
    provider.trx.getAccountResources = getAccountResourcesMock
    provider.trx.getChainParameters = getChainParametersMock

    provider.transactionBuilder.sendTrx = sendTrxMock
    provider.transactionBuilder.triggerSmartContract = triggerSmartContractMock
    provider.transactionBuilder.triggerConstantContract = triggerConstantContractMock

    return provider
  })

  Object.assign(MockTronWeb, RealTronWeb)
  MockTronWeb.address = RealTronWeb.address

  return { default: MockTronWeb }
})

const { default: TronWeb } = await import('tronweb')
const { WalletAccountTron, WalletAccountReadOnlyTron } = await import('../index.js')

describe('WalletAccountTron', () => {
  let account

  beforeEach(() => {
    jest.clearAllMocks()
    account = new WalletAccountTron(SEED_PHRASE, "0'/0/0", {
      provider: 'https://tron.web.provider/'
    })
  })

  afterEach(() => {
    if (account) account.dispose()
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', () => {
      expect(account.index).toBe(ACCOUNT.index)
      expect(account.path).toBe(ACCOUNT.path)
      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })
    })

    test('should successfully initialize an account for the given seed and path', () => {
      const acc = new WalletAccountTron(SEED, "0'/0/0", { provider: 'https://tron.web.provider/' })
      expect(acc.index).toBe(ACCOUNT.index)
      acc.dispose()
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => { new WalletAccountTron(INVALID_SEED_PHRASE, "0'/0/0") })
        .toThrow('The seed phrase is invalid.')
    })

    test('should throw if the path is invalid', () => {
      expect(() => { new WalletAccountTron(SEED_PHRASE, "a'/b/c") })
        .toThrow('invalid child index')
    })
  })

  describe('sign', () => {
    const MESSAGE = 'Dummy message to sign.'
    const EXPECTED_SIGNATURE = '0x67b1e4bb9a9b070cd60776ceab1ff4d7c4d4997bb5b4a71757da646f75d847e6600c22d8d83caa13d42c33099f75ba5ec30390467392aa78a3e5319da6c30e291b'

    test('should return the correct signature', async () => {
      const signature = await account.sign(MESSAGE)
      expect(signature).toBe(EXPECTED_SIGNATURE)
    })
  })

  describe('sendTransaction', () => {
    test('should successfully send a transaction', async () => {
      const TRANSACTION = {
        to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        value: 1_000_000
      }
      const DUMMY_TX_ID = 'abc123def456'

      sendTrxMock.mockResolvedValue({
        txID: 'mock-tx-id',
        raw_data_hex: '0a' + '00'.repeat(100)
      })

      sendRawTransactionMock.mockResolvedValue({ txid: DUMMY_TX_ID })

      getAccountResourcesMock.mockResolvedValue({
        freeNetLimit: 5000,
        freeNetUsed: 0,
        NetLimit: 0,
        NetUsed: 0
      })

      const { hash, fee } = await account.sendTransaction(TRANSACTION)

      expect(hash).toBe(DUMMY_TX_ID)
      expect(fee).toBe(0n)

      expect(sendTrxMock).toHaveBeenCalledWith(TRANSACTION.to, TRANSACTION.value, ACCOUNT.address)
      expect(sendRawTransactionMock).toHaveBeenCalled()
      expect(getAccountResourcesMock).toHaveBeenCalledWith(ACCOUNT.address)
    })

    test('should throw if the account is not connected to tron web', async () => {
      const disconnected = new WalletAccountTron(SEED_PHRASE, "0'/0/0")
      await expect(disconnected.sendTransaction({ to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', value: 1000 }))
        .rejects.toThrow('The wallet must be connected to tron web to send transactions.')
    })
  })

  describe('transfer', () => {
    test('should successfully transfer tokens', async () => {
      const TRANSFER = {
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        amount: 100_000_000
      }
      const DUMMY_TX_ID = 'xyz789abc123'

      triggerConstantContractMock.mockResolvedValue({
        constant_result: ['0000000000000000000000000000000000000000000000000000000000000064'],
        energy_used: 10000,
        transaction: {
          raw_data_hex: '0a' + '00'.repeat(200)
        }
      })

      triggerSmartContractMock.mockResolvedValue({
        transaction: {
          txID: 'mock-tx-id',
          raw_data_hex: '0a' + '00'.repeat(200)
        }
      })

      sendRawTransactionMock.mockResolvedValue({ txid: DUMMY_TX_ID })

      getAccountResourcesMock.mockResolvedValue({
        freeNetLimit: 5000,
        freeNetUsed: 0,
        NetLimit: 0,
        NetUsed: 0,
        EnergyLimit: 0,
        EnergyUsed: 0
      })

      getChainParametersMock.mockResolvedValue([
        { key: 'getEnergyFee', value: 420 }
      ])

      const { hash, fee } = await account.transfer(TRANSFER)

      expect(hash).toBe(DUMMY_TX_ID)
      expect(fee).toBe(4_200_000n)

      expect(triggerSmartContractMock).toHaveBeenCalledWith(
        TRANSFER.token,
        'transfer(address,uint256)',
        expect.objectContaining({
          feeLimit: 4_200_000,
          callValue: 0
        }),
        expect.arrayContaining([
          expect.objectContaining({ type: 'address' }),
          expect.objectContaining({ type: 'uint256', value: TRANSFER.amount })
        ]),
        TronWeb.address.toHex(ACCOUNT.address)
      )
      
      expect(getAccountResourcesMock).toHaveBeenCalledWith(ACCOUNT.address)
    })

    test('should throw if transfer fee exceeds the transfer max fee configuration', async () => {
      triggerConstantContractMock.mockResolvedValue({
        constant_result: ['0000000000000000000000000000000000000000000000000000000000000064'],
        energy_used: 100000,
        transaction: { raw_data_hex: '0a' + '00'.repeat(200) }
      })

      getAccountResourcesMock.mockResolvedValue({
        freeNetLimit: 0,
        freeNetUsed: 0,
        NetLimit: 0,
        NetUsed: 0,
        EnergyLimit: 0,
        EnergyUsed: 0
      })

      getChainParametersMock.mockResolvedValue([
        { key: 'getEnergyFee', value: 420 }
      ])

      const accountWithMaxFee = new WalletAccountTron(SEED_PHRASE, "0'/0/0", {
        provider: 'https://tron.web.provider/',
        transferMaxFee: 0
      })

      await expect(accountWithMaxFee.transfer({
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        amount: 100_000_000
      })).rejects.toThrow('Exceeded maximum fee cost for transfer operations.')

      accountWithMaxFee.dispose()
    })

    test('should throw if the account is not connected to tron web', async () => {
      const disconnected = new WalletAccountTron(SEED_PHRASE, "0'/0/0")
      await expect(disconnected.transfer({
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        amount: 100
      })).rejects.toThrow('The wallet must be connected to tron web to transfer tokens.')
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a read-only copy of the account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()
      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyTron)

      const address = await account.getAddress()
      const readOnlyAddress = await readOnlyAccount.getAddress()
      expect(readOnlyAddress).toBe(address)
    })
  })
})
