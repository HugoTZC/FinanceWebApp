export interface Expense {
    id: string;
    amount: number;
    category: string;
    date: Date;
  }
  
  export interface CreditCard {
    id: string;
    name: string;
    dueDate: string;
    balance: number;
  }
  
  export interface FinanceState {
    budget: number;
    expenses: Expense[];
    creditCards: CreditCard[];
  }