import React, { useContext, createContext, useReducer, ReactNode } from 'react';
import { FinanceState, Expense, CreditCard } from '../types/financeTypes';


type FinanceAction =
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_BUDGET'; payload: number };

const initialState: FinanceState = {
  budget: 15000,
  expenses: [],
  creditCards: [
    { id: '1', name: 'Visa', dueDate: '25', balance: 4500 }
  ]
};

const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_BUDGET':
      return { ...state, budget: action.payload };
    default:
      return state;
  }
};

const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
      throw new Error('useFinance debe usarse dentro de un FinanceProvider');
    }
    return context;
  };

const FinanceContext = createContext<{
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
}>({ state: initialState, dispatch: () => null });

const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(financeReducer, initialState);

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
      {children}
    </FinanceContext.Provider>
  );
};

export { useFinance, FinanceContext, FinanceProvider };