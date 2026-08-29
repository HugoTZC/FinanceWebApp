const mockQuery = jest.fn()
const mockRelease = jest.fn()
const mockGetClient = jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease })

jest.mock('../src/config/database', () => ({ getClient: mockGetClient }))

const transactionModel = require('../src/models/transactionModel')

describe('credit card payment atomic balance update', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockRelease.mockReset()
  })

  test('stores the payment and decreases card debt in one database transaction', async () => {
    const storedTransaction = {
      id: 'tx-1',
      user_id: 'user-1',
      type: 'expense',
      amount: 250,
      payment_method: 'credit_card_payment',
      credit_card_id: 'card-1',
    }
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [storedTransaction] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({})

    await transactionModel.create({
      user_id: 'user-1',
      title: 'Visa payment',
      amount: 250,
      transaction_date: '2026-08-29T00:00:00.000Z',
      type: 'expense',
      payment_method: 'credit_card_payment',
      credit_card_id: 'card-1',
    })

    expect(mockQuery.mock.calls[0][0]).toBe('BEGIN')
    expect(mockQuery.mock.calls[2][0]).toContain('balance = balance - $1')
    expect(mockQuery.mock.calls[2][1]).toEqual([250, 'card-1', 'user-1'])
    expect(mockQuery.mock.calls[3][0]).toBe('COMMIT')
    expect(mockRelease).toHaveBeenCalled()
  })
})
