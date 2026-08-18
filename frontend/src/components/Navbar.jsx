import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff') return '/staff';
    return '/dashboard';
  };

  return (
    <nav className="glass-nav" style={{ padding: '1rem 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            ♻️
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
            E-Waste <span className="gradient-text">Collection Portal</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>
            Home
          </Link>
          <Link to="/centers" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>
            Recycling Centers
          </Link>

          {user ? (
            <>
              <Link to={getDashboardPath()} style={{
                color: user.role === 'admin' ? '#38bdf8' : user.role === 'staff' ? '#fbbf24' : '#34d399',
                textDecoration: 'none',
                fontWeight: '600'
              }}>
                {user.role === 'admin' ? 'Admin Portal ⚡' : user.role === 'staff' ? 'Staff Portal 🚚' : 'User Portal 📋'}
              </Link>

              {(user.role === 'user' || user.role === 'citizen') && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#34d399'
                }}>
                  🌱 {user.ecoPoints || 0} Pts
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '500' }}>
                  Hi, {user.name} <small style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>({user.role})</small>
                </span>
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
