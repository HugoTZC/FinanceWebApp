import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <FinanceProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header siempre visible */}
          <Header onToggleSidebar={toggleSidebar} />
          
          {/* Contenedor principal */}
          <div style={{ display: 'flex', flex: 1 }}>
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            {/* Contenido principal */}
            <main style={{
              flex: 1,
              padding: '20px',
              marginTop: '60px', // Altura del header
              marginLeft: sidebarOpen ? '250px' : '0',
              transition: 'margin-left 0.3s'
            }}>
              <HomePage />
            </main>
          </div>
        </div>
      </Router>
    </FinanceProvider>
  );
};

export default App;