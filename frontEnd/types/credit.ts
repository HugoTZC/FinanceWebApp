export interface CreditCardType {
  id: string
  name: string
  last_four: string
  card_type?: string
  balance: number
  credit_limit: number
  interest_rate: number
  due_date: string
  min_payment: number
}

export interface LoanType {
  id: string
  name: string
  bank_number: string
  original_amount: number
  balance: number
  interest_rate: number
  term: string
  monthly_payment: number
  due_date: string
  loan_type: string
}

export interface MonthlySpending {
  month: string
  amount: number
}

export interface CategorySpending {
  category_name: string
  amount: number
}

export interface CreditTransaction {
  id: string
  title: string
  amount: number
  transaction_date: string
  category_name: string
}