import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import GlassCard from '../components/GlassCard';
import EwasteChart from '../components/EwasteChart';

const STATUS_ORDER = ['pending', 'verified', 'assigned', 'collected', 'warehouse', 'recycled'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users' | 'staff' | 'warehouse' | 'recycling'
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [warehouseData, setWarehouseData] = useState({ batches: [], totalStoredWeight: 0, totalStoredItems: 0 });
  const [centers, setCenters] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updateMsg, setUpdateMsg] = useState('');

  // Form for registering new staff
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', phone: '' });

  // Dispatch warehouse form
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('GreenTech Recycling Hub');

  const fetchData = async () => {
    try {
      const [reqRes, staffRes, usersRes, whRes, centersRes, fbRes] = await Promise.all([
        API.get('/pickups'),
        API.get('/auth/staff').catch(() => ({ data: [] })),
        API.get('/auth/users').catch(() => ({ data: [] })),
        API.get('/warehouse').catch(() => ({ data: { batches: [], totalStoredWeight: 0, totalStoredItems: 0 } })),
        API.get('/centers').catch(() => ({ data: [] })),
        API.get('/pickups/feedback').catch(() => ({ data: [] }))
      ]);

      setRequests(reqRes.data);
      setStaff(staffRes.data);
      setUsers(usersRes.data);
      setWarehouseData(whRes.data);
      setCenters(centersRes.data);
      setFeedbacks(fbRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-sync status updates between Staff and Admin consoles every 5 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyRequest = async (id) => {
    try {
      setUpdateMsg('Verifying pickup request...');
      const res = await API.put(`/pickups/${id}/verify`);
      setRequests(requests.map(r => r._id === id ? res.data : r));
      setUpdateMsg('✅ Request verified successfully!');
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      setUpdateMsg(err.response?.data?.msg || 'Failed to verify request');
    }
  };

  const handleAssignStaff = async (id, staffId, staffName) => {
    try {
      setUpdateMsg('Assigning staff to pickup request...');
      const res = await API.put(`/pickups/${id}/assign`, { staffId, staffName });
      setRequests(requests.map(r => r._id === id ? res.data : r));
      setUpdateMsg(`✅ Pickup assigned to staff member "${staffName}"!`);
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      setUpdateMsg(err.response?.data?.msg || 'Failed to assign staff');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/staff', newStaff);
      setStaff([...staff, res.data]);
      setNewStaff({ name: '', email: '', password: '', phone: '' });
      setUpdateMsg('✅ New staff member registered successfully!');
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create staff member');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this account?')) return;
    try {
      await API.delete(`/auth/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      setStaff(staff.filter(s => s._id !== userId));
      setUpdateMsg('Account removed successfully');
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to remove user');
    }
  };

  const handleDispatchRecycling = async (e) => {
    e.preventDefault();
    const storedBatches = warehouseData.batches?.filter(b => b.status === 'stored') || [];
    const bId = selectedBatch || (storedBatches[0] ? (storedBatches[0].batchCode || storedBatches[0]._id) : '');

    try {
      setUpdateMsg('Dispatching batch to authorized recycling centre...');
      const res = await API.post('/warehouse/dispatch', {
        batchId: bId,
        recyclingCentre: selectedCenter
      });
      setUpdateMsg(`✅ ${res.data.msg}`);
      setSelectedBatch('');
      fetchData(); // Refresh data
      setTimeout(() => setUpdateMsg(''), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Dispatch failed.';
      alert(errorMsg);
      setUpdateMsg(`❌ ${errorMsg}`);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    const targetReq = requests.find(r => r._id === requestId);
    if (!targetReq) return;

    const currentIdx = STATUS_ORDER.indexOf(targetReq.status || 'pending');
    const newIdx = STATUS_ORDER.indexOf(newStatus);

    if (newIdx <= currentIdx) {
      setUpdateMsg('❌ Status cannot be reverted to a previous or completed step.');
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (newIdx !== currentIdx + 1) {
      setUpdateMsg(`❌ Status must follow strict sequential order. Next required step is "${STATUS_ORDER[currentIdx + 1]}".`);
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    try {
      setUpdateMsg('Updating status...');
      const res = await API.put(`/pickups/${requestId}/status`, { status: newStatus });
      setRequests(requests.map(r => r._id === requestId ? res.data : r));
      setUpdateMsg(`✅ Status updated to "${newStatus}"! ${newStatus === 'recycled' ? 'Points awarded.' : ''}`);
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      setUpdateMsg(err.response?.data?.msg || 'Failed to update status');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const totalWeightRecycled = requests
    .filter(r => r.status === 'recycled')
    .reduce((acc, r) => acc + (r.weight || 0), 0);

  return (
    <div className="animate-fade-in" style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem', color: '#38bdf8' }}>
              Admin Console ⚡
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Full management of users, staff, pickup verification, warehouse records & recycling dispatch
            </p>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total System Requests</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem' }}>{requests.length}</div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Registered Users</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.25rem' }}>{users.length}</div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Staff Members</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>{staff.length}</div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Warehouse Inventory</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#c084fc', marginTop: '0.25rem' }}>
              {(warehouseData.totalStoredWeight || 0).toFixed(1)} kg
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recycled Volume</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>
              {totalWeightRecycled.toFixed(1)} kg
            </div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending Requests</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </GlassCard>
        </div>

        {/* Action Message Alert */}
        {updateMsg && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            {updateMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
          {[
            { id: 'requests', label: '📋 Pickup Requests & Assignment' },
            { id: 'feedback', label: '💬 User Feedback' },
            { id: 'users', label: '👥 Manage Users' },
            { id: 'staff', label: '🚚 Manage Staff' },
            { id: 'warehouse', label: '🏬 Warehouse Records' },
            { id: 'recycling', label: '♻️ Recycling Dispatch' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border-glass)',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Pickup Requests & Assignment */}
        {activeTab === 'requests' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <GlassCard style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>E-Waste Pickup Requests Queue</h3>
                
                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '0.35rem', background: '#111827', padding: '0.3rem', borderRadius: '8px', flexWrap: 'wrap' }}>
                  {['all', 'pending', 'verified', 'assigned', 'collected', 'warehouse', 'recycled'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        background: filter === f ? 'var(--primary)' : 'transparent',
                        color: filter === f ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
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
                <p style={{ color: 'var(--text-muted)' }}>Loading requests...</p>
              ) : filteredRequests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  No requests matching status filter "{filter}".
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredRequests.map(req => (
                    <div
                      key={req._id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <strong style={{ fontSize: '1.1rem' }}>{req.category}</strong>
                            <span className={`badge badge-${req.status}`}>{req.status}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            {req.description} ({req.weight} kg)
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>👤 {req.userName}</div>
                          {req.userPhone && (
                            <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>📞 {req.userPhone}</div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Date: {new Date(req.pickupDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        📍 <strong>Address:</strong> {req.address}
                      </div>

                      {/* Display user feedback if available */}
                      {req.feedback && (req.feedback.rating > 0 || req.feedback.comment) && (
                        <div style={{
                          fontSize: '0.8rem',
                          background: 'rgba(251, 191, 36, 0.1)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          color: '#fbbf24',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <span>💬 <strong>User Feedback:</strong> "{req.feedback.comment || 'No comment provided'}"</span>
                          <span>{'⭐'.repeat(req.feedback.rating || 5)} ({req.feedback.rating || 5}/5 Stars)</span>
                        </div>
                      )}

                      {/* Admin Workflow Actions: Verify & Assign Staff */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {req.status === 'pending' && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#38bdf8' }}
                              onClick={() => handleVerifyRequest(req._id)}
                            >
                              ✅ Verify Request
                            </button>
                          )}
                        </div>

                        {/* Assign Staff Dropdown - Assigned Only Once */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Staff:</span>
                          {req.assignedStaff ? (
                            <span style={{
                              background: 'rgba(251, 191, 36, 0.15)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              color: '#fbbf24',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              🔒 {req.assignedStaffName || 'Staff Assigned'} (Reassignment not allowed)
                            </span>
                          ) : (
                            <select
                              className="form-select"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: 'auto', opacity: req.status === 'pending' ? 0.5 : 1 }}
                              value={req.assignedStaff || ''}
                              disabled={req.status === 'pending'}
                              onChange={(e) => {
                                const selected = staff.find(s => String(s._id) === String(e.target.value));
                                handleAssignStaff(req._id, e.target.value, selected ? selected.name : 'Staff');
                              }}
                            >
                              <option value="">{req.status === 'pending' ? '-- Verify First to Assign --' : '-- Assign Staff --'}</option>
                              {staff.map(s => (
                                <option key={s._id} value={s._id}>
                                  {s.name || 'Staff Member'} ({s.email || 'No email'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Status update buttons - Strict Sequential Workflow */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginRight: '0.2rem' }}>
                            Sequential Flow:
                          </span>
                          {STATUS_ORDER.map((st, idx) => {
                            const currentIdx = STATUS_ORDER.indexOf(req.status || 'pending');
                            const isCompleted = idx < currentIdx;
                            const isCurrent = idx === currentIdx;
                            const isNext = idx === currentIdx + 1;
                            const isStaffStep = st === 'collected' || st === 'warehouse';

                            // Admin CANNOT update staff-only steps (collected & warehouse).
                            // Admin can only update non-staff steps when they are next in sequence.
                            const isDisabled = isCompleted || isCurrent || !isNext || isStaffStep;

                            let btnBg = 'rgba(255,255,255,0.02)';
                            let btnBorder = '1px solid rgba(255,255,255,0.06)';
                            let btnColor = 'rgba(255,255,255,0.25)';
                            let btnCursor = 'not-allowed';
                            let label = st;

                            if (isCompleted) {
                              btnBg = 'rgba(16, 185, 129, 0.1)';
                              btnBorder = '1px solid rgba(16, 185, 129, 0.3)';
                              btnColor = '#10b981';
                              btnCursor = 'not-allowed';
                              label = `✓ ${st}`;
                            } else if (isCurrent) {
                              btnBg = 'rgba(56, 189, 248, 0.15)';
                              btnBorder = '1px solid #38bdf8';
                              btnColor = '#38bdf8';
                              btnCursor = 'default';
                              label = `● ${st}`;
                            } else if (isNext) {
                              if (isStaffStep) {
                                // Staff-only step awaiting Staff action
                                btnBg = 'rgba(251, 191, 36, 0.1)';
                                btnBorder = '1px solid rgba(251, 191, 36, 0.4)';
                                btnColor = '#fbbf24';
                                btnCursor = 'not-allowed';
                                label = `⏳ ${st} (Staff Action)`;
                              } else {
                                // Admin step ready to advance
                                btnBg = 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)';
                                btnBorder = '1px solid #10b981';
                                btnColor = '#34d399';
                                btnCursor = 'pointer';
                                label = `➔ ${st}`;
                              }
                            }

                            return (
                              <button
                                key={st}
                                disabled={isDisabled}
                                onClick={() => handleStatusChange(req._id, st)}
                                title={
                                  isCompleted ? `Step completed (✓ ${st}) - View only` :
                                  isCurrent ? `Current active status (${st})` :
                                  isNext ? (isStaffStep ? `Only assigned Staff can update status to "${st}". Admin views completed status once updated by Staff.` : `Click to advance status to next step: "${st}"`) :
                                  'Strict sequential order: complete previous steps first'
                                }
                                style={{
                                  background: btnBg,
                                  border: btnBorder,
                                  color: btnColor,
                                  opacity: isDisabled ? (isCompleted ? 0.9 : 0.6) : 1,
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: isNext || isCurrent || isCompleted ? '600' : '400',
                                  cursor: btnCursor,
                                  textTransform: 'capitalize',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isNext && !isStaffStep ? '0 0 8px rgba(16, 185, 129, 0.25)' : 'none'
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <div>
              <GlassCard>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Overall Recycling Mix</h3>
                <EwasteChart requests={requests} />
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB 2: Manage Users */}
        {activeTab === 'users' && (
          <GlassCard style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>👥 Registered Users Management</h3>
            {users.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No citizen accounts found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Name</th>
                      <th style={{ padding: '0.75rem' }}>Email</th>
                      <th style={{ padding: '0.75rem' }}>Phone</th>
                      <th style={{ padding: '0.75rem' }}>Address</th>
                      <th style={{ padding: '0.75rem' }}>Eco Points</th>
                      <th style={{ padding: '0.75rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{u.name}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem', color: '#fbbf24' }}>{u.phone || 'N/A'}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.address || 'N/A'}</td>
                        <td style={{ padding: '0.75rem', color: '#34d399', fontWeight: '700' }}>{u.ecoPoints || 0} Pts</td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 3: Manage Staff */}
        {activeTab === 'staff' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            <GlassCard>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>➕ Register New Staff Member</h3>
              <form onSubmit={handleAddStaff}>
                <div className="form-group">
                  <label className="form-label">Staff Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Collector"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Staff Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="staff@ewaste.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Set temporary password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98765 11111"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Register Staff
                </button>
              </form>
            </GlassCard>

            <GlassCard>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🚚 Active Staff Members</h3>
              {staff.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No staff registered yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {staff.map(s => {
                    const assignedTasks = requests.filter(r => String(r.assignedStaff) === String(s._id));
                    return (
                      <div
                        key={s._id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-glass)',
                          padding: '1rem',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#fff' }}>{s.name}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.email} • {s.phone || 'No phone'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                            Current Assigned Workload: <strong>{assignedTasks.length} task(s)</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteUser(s._id)}
                          style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Remove Staff
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* TAB 4: Warehouse Records */}
        {activeTab === 'warehouse' && (
          <GlassCard style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem' }}>🏬 Temporary Warehouse Inventory Records</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  E-waste transported by staff members is stored here until bulk dispatch to authorized recycling centres.
                </p>
              </div>
              <div style={{ background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '0.5rem 1rem', borderRadius: '10px', color: '#c084fc', fontWeight: '700' }}>
                Total Stored Volume: {(warehouseData.totalStoredWeight || 0).toFixed(1)} kg
              </div>
            </div>

            {(!warehouseData.batches || warehouseData.batches.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No warehouse batch records found. Transport collected items to warehouse using staff module.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {warehouseData.batches.map(batch => (
                  <div
                    key={batch._id || batch.batchCode}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#38bdf8' }}>{batch.batchCode}</strong>
                      <span className={`badge badge-${batch.status}`}>{batch.status}</span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Total Weight: <strong>{(batch.totalWeight || 0).toFixed(1)} kg</strong>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      Items Count: {batch.itemCount || 0} items
                    </div>

                    {batch.recyclingCentre && (
                      <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.25rem' }}>
                        Dispatched to: {batch.recyclingCentre}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 5: Contact Authorized Recycling Centre & Update Status */}
        {activeTab === 'recycling' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <GlassCard>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>🏢 Contact Authorized Recycling Centre</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Arrange bulk e-waste transfer from temporary warehouse to an authorized recycling facility.
              </p>

              <form onSubmit={handleDispatchRecycling}>
                <div className="form-group">
                  <label className="form-label">Select Warehouse Inventory Batch</label>
                  <select
                    className="form-select"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    <option value="">-- Active Warehouse Batches --</option>
                    {warehouseData.batches?.filter(b => b.status === 'stored').map(b => (
                      <option key={b._id || b.batchCode} value={b.batchCode}>
                        {b.batchCode} — ({b.totalWeight} kg, {b.itemCount} items)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Authorized Recycling Centre</label>
                  <select
                    className="form-select"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                  >
                    {centers.map(c => (
                      <option key={c._id || c.name} value={c.name}>{c.name} ({c.address})</option>
                    ))}
                    <option value="GreenTech Recycling Hub">GreenTech Recycling Hub</option>
                    <option value="Eco-Cycle E-Waste Point">Eco-Cycle E-Waste Point</option>
                    <option value="Global Electronic Waste Depot">Global Electronic Waste Depot</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }}>
                  ♻️ Schedule Recycling Pickup & Update Status to Completed
                </button>
              </form>
            </GlassCard>

            <GlassCard>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Authorized Recycling Partners</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {centers.map(c => (
                  <div key={c._id || c.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '10px' }}>
                    <strong style={{ fontSize: '1rem', color: '#34d399' }}>{c.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>📍 {c.address}</div>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.25rem' }}>📞 {c.phone} • {c.operatingHours}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* TAB: User Feedback */}
        {activeTab === 'feedback' && (
          <GlassCard style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: '#38bdf8' }}>💬 User Feedback Log</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                View 1–5 star ratings and comments submitted by users for completed e-waste pickups.
              </p>
            </div>

            {(() => {
              const allFeedback = (feedbacks.length > 0 ? feedbacks : requests.filter(r => r.feedback && (r.feedback.comment || r.feedback.rating > 0)).map(r => ({
                requestId: r._id,
                userName: r.userName,
                userPhone: r.userPhone,
                category: r.category,
                rating: r.feedback.rating,
                message: r.feedback.comment,
                comment: r.feedback.comment,
                date: r.feedback.date || r.createdAt
              })));

              if (allFeedback.length === 0) {
                return (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
                    No user feedback submitted yet.
                  </p>
                );
              }

              const avgRating = (allFeedback.reduce((acc, f) => acc + (f.rating || 5), 0) / allFeedback.length).toFixed(1);

              return (
                <div>
                  {/* Summary Bar */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>💬</span>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Feedbacks</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#38bdf8' }}>{allFeedback.length}</div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>⭐</span>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average User Rating</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fbbf24' }}>{avgRating} / 5.0</div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {allFeedback.map((fb, idx) => (
                      <div
                        key={fb.requestId || idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#fff' }}>👤 {fb.userName}</strong>
                          <span style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: '700' }}>
                            {'⭐'.repeat(fb.rating || 5)} ({fb.rating || 5}/5)
                          </span>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #34d399', fontStyle: 'italic' }}>
                          "{fb.message || fb.comment || 'No comment provided'}"
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                          <span>📦 Category: <strong>{fb.category || 'E-Waste'}</strong></span>
                          <span>📅 Date: {fb.date ? new Date(fb.date).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
