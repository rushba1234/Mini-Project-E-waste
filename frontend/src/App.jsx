import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Centers from './pages/Centers';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const getRedirectPath = (u) => {
    if (!u) return '/login';
    if (u.role === 'admin') return '/admin';
    if (u.role === 'staff') return '/staff';
    return '/dashboard';
  };

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar user={user} setUser={setUser} />
        
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/centers" element={<Centers />} />
            
            <Route
              path="/login"
              element={user ? <Navigate to={getRedirectPath(user)} /> : <Login setUser={setUser} />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to={getRedirectPath(user)} /> : <Register setUser={setUser} />}
            />
            
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />}
            />

            <Route
              path="/staff"
              element={user && user.role === 'staff' ? <StaffDashboard user={user} /> : <Navigate to="/login" />}
            />

            <Route
              path="/admin"
              element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>

        <footer style={{
          borderTop: '1px solid var(--border-glass)',
          padding: '2rem 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          background: 'rgba(9, 13, 22, 0.9)'
        }}>
          <div className="container">
            <p>🌱 <strong>E-Waste Collection Portal</strong> — Safe Doorstep Collection & Responsible Recycling System</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              Built with React, Node.js, Express & MongoDB (MERN Stack)
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
