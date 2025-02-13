import React from 'react';
import BalanceCard from '../components/common/BalanceCard';

const HomePage: React.FC = () => {
  return (
    <div className="container-fluid p-4">
      <h1>Mi Dashboard Financiero</h1>
      <div className="row mt-4">
        <div className="col-md-4">
          <BalanceCard />
        </div>
      </div>
    </div>
  );
};

export default HomePage;