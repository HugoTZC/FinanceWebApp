import React from 'react';
import { Card } from 'react-bootstrap';
import { useFinance } from '../../context/FinanceContext';  // Ruta corregida

const BalanceCard: React.FC = () => {
  const { state } = useFinance();
  
  const totalExpenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  return (
    <Card className="bg-dark text-white">
      <Card.Body>
        <h5>Presupuesto Restante</h5>
        <h2>${state.budget - totalExpenses}</h2>
        <small>De ${state.budget}</small>
      </Card.Body>
    </Card>
  );
};

export default BalanceCard;