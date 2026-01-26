import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import * as bip39 from 'bip39'

import { WalletAccountTron, WalletAccountReadOnlyTron } from '../index.js'

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

describe('WalletAccountTron', () => {
  let account

  beforeEach(() => {
    account = new WalletAccountTron(SEED_PHRASE, "0'/0/0")
  })

  afterEach(() => {
    account.dispose()
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', () => {
      const account = new WalletAccountTron(SEED_PHRASE, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })

      account.dispose()
    })

    test('should successfully initialize an account for the given seed and path', () => {
      const account = new WalletAccountTron(SEED, "0'/0/0")

      expect(account.index).toBe(ACCOUNT.index)

      expect(account.path).toBe(ACCOUNT.path)

      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })

      account.dispose()
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

    test('should return a valid signature', async () => {
      const signature = await account.sign(MESSAGE)

      expect(typeof signature).toBe('string')
      expect(signature).toMatch(/^0x[0-9a-f]+$/)
      expect(signature.length).toBe(132)
    })
  })

  describe('verify', () => {
    const MESSAGE = 'Dummy message to sign.'

    test('should return true for a valid signature', async () => {
      const signature = await account.sign(MESSAGE)

      const result = await account.verify(MESSAGE, signature)

      expect(result).toBe(true)
    })

    test('should return false for an invalid signature', async () => {
      const signature = await account.sign(MESSAGE)

      const result = await account.verify('Another message.', signature)

      expect(result).toBe(false)
    })

    test('should throw on a malformed signature', async () => {
      await expect(account.verify(MESSAGE, '0xinvalid'))
        .rejects.toThrow()
    })
  })

  describe('sendTransaction', () => {
    test('should successfully send a transaction', async () => {
      const TRANSACTION = {
        to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        value: 1_000_000
      }

      const DUMMY_TX_ID = 'abc123def456'

      const mockTronWeb = {
        transactionBuilder: {
          sendTrx: jest.fn().mockResolvedValue({
            txID: 'mock-tx-id',
            raw_data_hex: '0a' + '00'.repeat(100)
          })
        },
        trx: {
          sendRawTransaction: jest.fn().mockResolvedValue({
            txid: DUMMY_TX_ID
          }),
          getAccountResources: jest.fn().mockResolvedValue({
            freeNetLimit: 5000,
            freeNetUsed: 0,
            NetLimit: 0,
            NetUsed: 0
          })
        }
      }

      account._tronWeb = mockTronWeb

      const { hash, fee } = await account.sendTransaction(TRANSACTION)

      expect(mockTronWeb.transactionBuilder.sendTrx).toHaveBeenCalledWith(
        TRANSACTION.to,
        TRANSACTION.value,
        expect.any(String)
      )

      expect(mockTronWeb.trx.sendRawTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          txID: 'mock-tx-id',
          signature: expect.any(Array)
        })
      )

      expect(hash).toBe(DUMMY_TX_ID)
      expect(typeof fee).toBe('bigint')
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.sendTransaction({ to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', value: 1000 }))
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

      const mockTronWeb = {
        address: {
          toHex: jest.fn((addr) => '41' + addr.slice(1)),
          fromHex: jest.fn((hex) => 'T' + hex.slice(2))
        },
        transactionBuilder: {
          triggerSmartContract: jest.fn().mockResolvedValue({
            transaction: {
              txID: 'mock-tx-id',
              raw_data_hex: '0a' + '00'.repeat(200)
            }
          }),
          triggerConstantContract: jest.fn().mockResolvedValue({
            constant_result: ['0000000000000000000000000000000000000000000000000000000000000064'],
            energy_used: 10000,
            transaction: {
              raw_data_hex: '0a' + '00'.repeat(200)
            }
          })
        },
        trx: {
          sendRawTransaction: jest.fn().mockResolvedValue({
            txid: DUMMY_TX_ID
          }),
          getAccountResources: jest.fn().mockResolvedValue({
            freeNetLimit: 5000,
            freeNetUsed: 0,
            NetLimit: 0,
            NetUsed: 0,
            EnergyLimit: 100000,
            EnergyUsed: 0
          }),
          getChainParameters: jest.fn().mockResolvedValue([
            { key: 'getEnergyFee', value: 420 }
          ])
        },
        toBigNumber: jest.fn((val) => val)
      }

      account._tronWeb = mockTronWeb

      const { hash, fee } = await account.transfer(TRANSFER)

      expect(mockTronWeb.transactionBuilder.triggerSmartContract).toHaveBeenCalledWith(
        TRANSFER.token,
        'transfer(address,uint256)',
        expect.objectContaining({
          feeLimit: expect.any(Number),
          callValue: 0
        }),
        expect.arrayContaining([
          expect.objectContaining({ type: 'address' }),
          expect.objectContaining({ type: 'uint256', value: TRANSFER.amount })
        ]),
        expect.any(String)
      )

      expect(mockTronWeb.trx.sendRawTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          txID: 'mock-tx-id',
          signature: expect.any(Array)
        })
      )

      expect(hash).toBe(DUMMY_TX_ID)
      expect(typeof fee).toBe('bigint')
    })

    test('should throw if transfer fee exceeds the transfer max fee configuration', async () => {
      const TRANSFER = {
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        amount: 100_000_000
      }

      const mockTronWeb = {
        address: {
          toHex: jest.fn((addr) => '41' + addr.slice(1))
        },
        transactionBuilder: {
          triggerConstantContract: jest.fn().mockResolvedValue({
            constant_result: ['0000000000000000000000000000000000000000000000000000000000000064'],
            energy_used: 100000,
            transaction: {
              raw_data_hex: '0a' + '00'.repeat(200)
            }
          })
        },
        trx: {
          getAccountResources: jest.fn().mockResolvedValue({
            freeNetLimit: 0,
            freeNetUsed: 0,
            NetLimit: 0,
            NetUsed: 0,
            EnergyLimit: 0,
            EnergyUsed: 0
          }),
          getChainParameters: jest.fn().mockResolvedValue([
            { key: 'getEnergyFee', value: 420 }
          ])
        },
        toBigNumber: jest.fn((val) => val)
      }

      const accountWithMaxFee = new WalletAccountTron(SEED_PHRASE, "0'/0/0", {
        provider: mockTronWeb,
        transferMaxFee: 0
      })

      accountWithMaxFee._tronWeb = mockTronWeb

      await expect(accountWithMaxFee.transfer(TRANSFER))
        .rejects.toThrow('Exceeded maximum fee cost for transfer operations.')

      accountWithMaxFee.dispose()
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.transfer({
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        amount: 100
      }))
        .rejects.toThrow('The wallet must be connected to tron web to transfer tokens.')
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

  describe('dispose', () => {
    test('should erase the private key from memory', () => {
      const account = new WalletAccountTron(SEED_PHRASE, "0'/0/0")

      expect(account._account.privateKey).toBeDefined()

      account.dispose()

      expect(account._account.privateKey).toBeFalsy()
    })
  })
})
