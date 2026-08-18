import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import API from '../utils/api';

const Home = ({ user }) => {
  const [stats, setStats] = useState({
    totalWeightRecycled: 0,
    totalPickups: 0,
    totalPointsAwarded: 0,
    activeCenters: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching live stats:', err);
      }
    };
    fetchStats();
  }, []);

  const getDashboardLink = () => {
    if (!user) return '/register';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff') return '/staff';
    return '/dashboard';
  };

  return (
    <div className="animate-fade-in" style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '850px', margin: '0 auto 4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1.5rem'
          }}>
            🌱 E-Waste Collection & Recycling Management Portal
          </div>

          <h1 style={{ fontSize: '3.2rem', fontWeight: '800', lineHeight: 1.15, marginBottom: '1.5rem' }}>
            Safe Collection & Disposal of <br />
            <span className="gradient-text">Electronic Waste</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Request doorstep pickup of unwanted mobile phones, laptops, batteries, chargers, televisions, and other electronics. 
            Connecting Citizens, Collection Staff, and Authorized Recycling Centres.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to={getDashboardLink()} className="btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
                Go to Portal Console →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
                  Submit Pickup Request
                </Link>
                <Link to="/login" className="btn-secondary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
                  Staff / Admin Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* System Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          <GlassCard>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#10b981', marginBottom: '0.25rem' }}>
              {stats.totalWeightRecycled.toFixed(1)} kg
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Recycled E-Waste</div>
          </GlassCard>
          
          <GlassCard>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#06b6d4', marginBottom: '0.25rem' }}>
              {stats.totalPickups}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Total Pickup Requests</div>
          </GlassCard>

          <GlassCard>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#f59e0b', marginBottom: '0.25rem' }}>
              {stats.totalPointsAwarded}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Eco Points Awarded</div>
          </GlassCard>

          <GlassCard>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#a855f7', marginBottom: '0.25rem' }}>
              {stats.activeCenters}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Authorized Recycling Partners</div>
          </GlassCard>
        </div>

        {/* 3 Core Modules Section */}
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '3rem' }}>
            System <span className="gradient-text">Modules</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👤</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#34d399' }}>User Module</h3>
              <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, paddingLeft: '1.2rem' }}>
                <li>User Registration & Secure Login</li>
                <li>Manage Contact Profile & Address</li>
                <li>Submit Doorstep E-Waste Pickup Requests</li>
                <li>Real-Time Request Status Timeline Tracking</li>
                <li>Provide Service Ratings & Feedback</li>
              </ul>
            </GlassCard>

            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚚</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#fbbf24' }}>Staff Module</h3>
              <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, paddingLeft: '1.2rem' }}>
                <li>Staff Member Login</li>
                <li>View Assigned Pickup Requests</li>
                <li>Direct One-Click Contact User</li>
                <li>Collect E-Waste from User Location</li>
                <li>Transport E-Waste to Temporary Warehouse</li>
              </ul>
            </GlassCard>

            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#38bdf8' }}>Admin Module</h3>
              <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, paddingLeft: '1.2rem' }}>
                <li>Admin Console & System Dashboard</li>
                <li>Manage Registered Users & Staff Members</li>
                <li>Verify Requests & Assign to Staff</li>
                <li>Manage Temporary Warehouse Storage Records</li>
                <li>Contact Authorized Recycling Centre & Complete Status</li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
