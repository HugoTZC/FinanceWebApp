jest.mock('../src/models/transactionModel', () => ({ create: jest.fn() }))
jest.mock('../src/models/categoryModel', () => ({
  findById: jest.fn(),
  findUserCategoryById: jest.fn(),
}))
jest.mock('../src/models/creditModel', () => ({ getCreditCardById: jest.fn() }))

const transactionModel = require('../src/models/transactionModel')
const categoryModel = require('../src/models/categoryModel')
const creditModel = require('../src/models/creditModel')
const { createTransaction } = require('../src/controllers/transactionController')

describe('credit card payment controller contract', () => {
  beforeEach(() => jest.clearAllMocks())

  test('creates an income payment without requiring a category', async () => {
    transactionModel.create.mockResolvedValue({ id: 'tx-1', title: 'Visa payment', amount: 250 })
    creditModel.getCreditCardById.mockResolvedValue({ id: 'card-1', balance: 500 })
    const req = {
      method: 'POST',
      path: '/transactions',
      headers: {},
      cookies: {},
      user: { id: 'user-1', email: 'test@example.com' },
      body: {
        title: 'Visa payment',
        amount: 250,
        transaction_date: '2026-08-29T00:00:00.000Z',
        type: 'expense',
        category: null,
        payment_method: 'credit_card_payment',
        credit_card_id: 'card-1',
      },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    await createTransaction(req, res, next)

    expect(categoryModel.findById).not.toHaveBeenCalled()
    expect(transactionModel.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      payment_method: 'credit_card_payment',
      credit_card_id: 'card-1',
      category_id: null,
      user_category_id: null,
    }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(next).not.toHaveBeenCalled()
  })

  test('rejects a payment larger than the card debt', async () => {
    creditModel.getCreditCardById.mockResolvedValue({ id: 'card-1', balance: 100 })
    const req = {
      method: 'POST', path: '/transactions', headers: {}, cookies: {},
      user: { id: 'user-1', email: 'test@example.com' },
      body: {
        title: 'Visa payment', amount: 500, transaction_date: '2026-08-29T00:00:00.000Z',
        type: 'expense', category: null, payment_method: 'credit_card_payment', credit_card_id: 'card-1',
      },
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    await createTransaction(req, res, next)

    expect(transactionModel.create).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
  })
})
