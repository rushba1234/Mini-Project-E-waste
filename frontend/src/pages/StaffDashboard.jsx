import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import GlassCard from '../components/GlassCard';

const StaffDashboard = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionMsg, setActionMsg] = useState('');

  const fetchStaffTasks = async () => {
    try {
      const res = await API.get('/pickups');
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching staff tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffTasks();
  }, []);

  const handleMarkCollected = async (id) => {
    try {
      setActionMsg('Updating task to Collected...');
      const res = await API.put(`/pickups/${id}/collect`);
      setRequests(requests.map(r => r._id === id ? res.data : r));
      setActionMsg('✅ E-Waste collected from user location!');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionMsg(err.response?.data?.msg || 'Failed to update collection status.');
    }
  };

  const handleMarkWarehouse = async (id) => {
    try {
      setActionMsg('Transporting e-waste to temporary warehouse...');
      const res = await API.put(`/pickups/${id}/warehouse`);
      setRequests(requests.map(r => r._id === id ? res.data : r));
      setActionMsg('📦 E-Waste transported to temporary warehouse & inventory recorded!');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setActionMsg(err.response?.data?.msg || 'Failed to transfer to warehouse.');
    }
  };

  const filtered = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingAssignedCount = requests.filter(r => r.status === 'assigned' || r.status === 'verified').length;
  const collectedCount = requests.filter(r => r.status === 'collected').length;
  const warehouseCount = requests.filter(r => r.status === 'warehouse' || r.status === 'recycled').length;

  return (
    <div className="animate-fade-in" style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem', color: '#fbbf24' }}>
              Staff Pickup Console 🚚
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Welcome, {user?.name || 'Staff Member'}. Manage assigned e-waste collections & warehouse drop-offs.
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending Pickups</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>
              {pendingAssignedCount}
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Collected Items</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.25rem' }}>
              {collectedCount}
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Delivered to Warehouse</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>
              {warehouseCount}
            </div>
          </GlassCard>
        </div>

        {/* Notification Alert */}
        {actionMsg && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚡</span> {actionMsg}
          </div>
        )}

        {/* Assigned Pickup Tasks */}
        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.3rem' }}>Assigned E-Waste Pickups</h3>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#111827', padding: '0.3rem', borderRadius: '8px' }}>
              {['all', 'assigned', 'collected', 'warehouse', 'recycled'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? '#fbbf24' : 'transparent',
                    color: filter === f ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading assigned tasks...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              No pickup requests assigned under filter "{filter}".
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filtered.map(req => (
                <div
                  key={req._id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${req.status}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        {req.status}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Date: {new Date(req.pickupDate).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.25rem' }}>
                      {req.category}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {req.description} • <strong>{req.weight} kg</strong>
                    </p>

                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      <div>👤 <strong>User:</strong> {req.userName}</div>
                      <div>📍 <strong>Address:</strong> {req.address}</div>
                      {req.userPhone && (
                        <div>📞 <strong>Phone:</strong> {req.userPhone}</div>
                      )}
                    </div>
                  </div>

                  {/* Staff Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {req.userPhone && (
                      <a
                        href={`tel:${req.userPhone}`}
                        className="btn-secondary"
                        style={{ textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem' }}
                      >
                        📞 Contact User ({req.userPhone})
                      </a>
                    )}

                    {req.status !== 'collected' && req.status !== 'warehouse' && req.status !== 'recycled' && (
                      <button
                        onClick={() => handleMarkCollected(req._id)}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
                      >
                        🚚 Mark Collected from User
                      </button>
                    )}

                    {(req.status === 'collected' || req.status === 'assigned') && (
                      <button
                        onClick={() => handleMarkWarehouse(req._id)}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                      >
                        🏬 Transport E-Waste to Warehouse
                      </button>
                    )}

                    {req.status === 'warehouse' && (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        textAlign: 'center',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        ✅ Stored in Temporary Warehouse (Batch: {req.warehouseBatchId || 'WH-BATCH'})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default StaffDashboard;
