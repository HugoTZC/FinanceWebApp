import React from 'react';
import { Navbar, Button, Container } from 'react-bootstrap';
import { useFinance } from '../../context/FinanceContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { state } = useFinance();

  return (
    <Navbar 
      bg="dark" 
      variant="dark" 
      fixed="top"
      style={{ height: '60px', zIndex: 1000 }}
    >
      <Container fluid>
        {/* Botón hamburguesa */}
        <Button
          variant="outline-light"
          onClick={onToggleSidebar}
          className="me-3"
        >
          <i className="bi bi-list"></i>
        </Button>

        <Navbar.Brand href="#">
          Mi Finanzas
        </Navbar.Brand>
      </Container>
    </Navbar>
  );
};

export default Header;