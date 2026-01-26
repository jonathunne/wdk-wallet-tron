import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import TronWeb from 'tronweb'

import { WalletAccountReadOnlyTron } from '../index.js'

const ADDRESS = 'TLpETV5SGJVx6xLRRcDeMfQa3LeobqHu1x'

describe('WalletAccountReadOnlyTron', () => {
  let account

  beforeEach(() => {
    account = new WalletAccountReadOnlyTron(ADDRESS)
  })

  describe('verify', () => {
    const MESSAGE = 'Dummy message to sign.'

    test('should return true for a valid signature', async () => {
      const SIGNATURE = '0xd130f94c52bf393206267278ac0b6009e14f11712578e5c1f7afe4a12685c5b96a77a0832692d96fc51f4bd403839572c55042ecbcc92d215879c5c8bb5778c51c'

      const mockVerifyMessageV2 = jest.spyOn(TronWeb.Trx, 'verifyMessageV2')
        .mockResolvedValue(ADDRESS)

      const result = await account.verify(MESSAGE, SIGNATURE)

      expect(mockVerifyMessageV2).toHaveBeenCalledWith(MESSAGE, SIGNATURE)
      expect(result).toBe(true)

      mockVerifyMessageV2.mockRestore()
    })

    test('should return false for an invalid signature', async () => {
      const SIGNATURE = '0xd130f94c52bf393206267278ac0b6009e14f11712578e5c1f7afe4a12685c5b96a77a0832692d96fc51f4bd403839572c55042ecbcc92d215879c5c8bb5778c51c'

      const mockVerifyMessageV2 = jest.spyOn(TronWeb.Trx, 'verifyMessageV2')
        .mockResolvedValue('TDifferentAddress123456789')

      const result = await account.verify(MESSAGE, SIGNATURE)

      expect(mockVerifyMessageV2).toHaveBeenCalledWith(MESSAGE, SIGNATURE)
      expect(result).toBe(false)

      mockVerifyMessageV2.mockRestore()
    })

    test('should throw on a malformed signature', async () => {
      await expect(account.verify(MESSAGE, '0xinvalid'))
        .rejects.toThrow()
    })
  })

  describe('getBalance', () => {
    test('should return the correct balance of the account', async () => {
      const EXPECTED_BALANCE = 1_000_000_000n

      const mockTronWeb = {
        trx: {
          getBalance: jest.fn().mockResolvedValue(1_000_000_000)
        }
      }

      account._tronWeb = mockTronWeb

      const balance = await account.getBalance()

      expect(mockTronWeb.trx.getBalance).toHaveBeenCalledWith(ADDRESS)
      expect(balance).toBe(EXPECTED_BALANCE)
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.getBalance())
        .rejects.toThrow('The wallet must be connected to tron web to retrieve balances.')
    })
  })

  describe('getTokenBalance', () => {
    const TOKEN_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

    test('should return the correct token balance of the account', async () => {
      const EXPECTED_BALANCE = 1_000_000n

      const mockTronWeb = {
        address: {
          toHex: jest.fn((addr) => '41' + addr.slice(1))
        },
        transactionBuilder: {
          triggerConstantContract: jest.fn().mockResolvedValue({
            constant_result: ['00000000000000000000000000000000000000000000000000000000000f4240']
          })
        },
        toBigNumber: jest.fn(() => '1000000')
      }

      account._tronWeb = mockTronWeb

      const balance = await account.getTokenBalance(TOKEN_ADDRESS)

      expect(mockTronWeb.transactionBuilder.triggerConstantContract).toHaveBeenCalledWith(
        TOKEN_ADDRESS,
        'balanceOf(address)',
        {},
        expect.arrayContaining([
          expect.objectContaining({ type: 'address' })
        ]),
        expect.any(String)
      )

      expect(balance).toBe(EXPECTED_BALANCE)
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.getTokenBalance(TOKEN_ADDRESS))
        .rejects.toThrow('The wallet must be connected to tron web to retrieve token balances.')
    })
  })

  describe('quoteSendTransaction', () => {
    test('should successfully quote a transaction', async () => {
      const TRANSACTION = {
        to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
        value: 1_000_000
      }

      const EXPECTED_FEE = 202_000n

      const mockTronWeb = {
        transactionBuilder: {
          sendTrx: jest.fn().mockResolvedValue({
            txID: 'mock-tx-id',
            raw_data_hex: '0a' + '00'.repeat(100)
          })
        },
        trx: {
          getAccountResources: jest.fn().mockResolvedValue({
            freeNetLimit: 5000,
            freeNetUsed: 4900,
            NetLimit: 0,
            NetUsed: 0
          })
        }
      }

      account._tronWeb = mockTronWeb

      const { fee } = await account.quoteSendTransaction(TRANSACTION)

      expect(mockTronWeb.transactionBuilder.sendTrx).toHaveBeenCalledWith(
        TRANSACTION.to,
        TRANSACTION.value,
        ADDRESS
      )

      expect(fee).toBe(EXPECTED_FEE)
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.quoteSendTransaction({ to: ADDRESS, value: 1000 }))
        .rejects.toThrow('The wallet must be connected to tron web to quote transactions.')
    })
  })

  describe('quoteTransfer', () => {
    test('should successfully quote a transfer operation', async () => {
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
            energy_used: 10000,
            transaction: {
              raw_data_hex: '0a' + '00'.repeat(200)
            }
          })
        },
        trx: {
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

      const { fee } = await account.quoteTransfer(TRANSFER)

      expect(mockTronWeb.transactionBuilder.triggerConstantContract).toHaveBeenCalledWith(
        TRANSFER.token,
        'transfer(address,uint256)',
        {},
        expect.arrayContaining([
          expect.objectContaining({ type: 'address' }),
          expect.objectContaining({ type: 'uint256', value: TRANSFER.amount })
        ]),
        expect.any(String)
      )

      expect(typeof fee).toBe('bigint')
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.quoteTransfer({
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        recipient: ADDRESS,
        amount: 100
      }))
        .rejects.toThrow('The wallet must be connected to tron web to quote transfer operations.')
    })
  })

  describe('getTransactionReceipt', () => {
    const TRANSACTION_HASH = 'abc123def456'

    test('should return the correct transaction receipt', async () => {
      const DUMMY_RECEIPT = {
        id: TRANSACTION_HASH,
        blockNumber: 12345,
        fee: 1000,
        result: 'SUCCESS'
      }

      const mockTronWeb = {
        trx: {
          getTransactionInfo: jest.fn().mockResolvedValue(DUMMY_RECEIPT)
        }
      }

      account._tronWeb = mockTronWeb

      const receipt = await account.getTransactionReceipt(TRANSACTION_HASH)

      expect(mockTronWeb.trx.getTransactionInfo).toHaveBeenCalledWith(TRANSACTION_HASH)
      expect(receipt).toEqual(DUMMY_RECEIPT)
    })

    test('should return null if the transaction has not been included in a block yet', async () => {
      const mockTronWeb = {
        trx: {
          getTransactionInfo: jest.fn().mockResolvedValue({})
        }
      }

      account._tronWeb = mockTronWeb

      const receipt = await account.getTransactionReceipt(TRANSACTION_HASH)

      expect(mockTronWeb.trx.getTransactionInfo).toHaveBeenCalledWith(TRANSACTION_HASH)
      expect(receipt).toBe(null)
    })

    test('should throw if the account is not connected to tron web', async () => {
      await expect(account.getTransactionReceipt(TRANSACTION_HASH))
        .rejects.toThrow('The wallet must be connected to tron web to fetch transaction receipts.')
    })
  })
})
