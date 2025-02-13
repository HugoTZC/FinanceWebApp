import React from 'react';
import { Nav, Offcanvas } from 'react-bootstrap';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Sidebar para mobile */}
      <Offcanvas
        show={isOpen}
        onHide={onClose}
        placement="start"
        style={{ width: '250px', top: '60px' }}
        className="d-lg-none"
      >
        <Offcanvas.Body>
          <Nav className="flex-column">
            <Nav.Link href="#">Dashboard</Nav.Link>
            <Nav.Link href="#">Presupuesto</Nav.Link>
            <Nav.Link href="#">Tarjetas</Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Sidebar para desktop */}
      <div 
        className="d-none d-lg-block" 
        style={{ 
          width: '250px',
          position: 'fixed',
          top: '60px',
          left: '0',
          bottom: '0',
          backgroundColor: '#2c3e50',
          padding: '20px',
          zIndex: 999
        }}
      >
        <Nav className="flex-column">
          <Nav.Link href="#" className="text-white">Dashboard</Nav.Link>
          <Nav.Link href="#" className="text-white">Presupuesto</Nav.Link>
          <Nav.Link href="#" className="text-white">Tarjetas</Nav.Link>
        </Nav>
      </div>
    </>
  );
};

export default Sidebar;