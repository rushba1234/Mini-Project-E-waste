import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import GlassCard from '../components/GlassCard';
import EwasteChart from '../components/EwasteChart';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users' | 'staff' | 'warehouse' | 'recycling'
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [warehouseData, setWarehouseData] = useState({ batches: [], totalStoredWeight: 0, totalStoredItems: 0 });
  const [centers, setCenters] = useState([]);

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
      const [reqRes, staffRes, usersRes, whRes, centersRes] = await Promise.all([
        API.get('/pickups'),
        API.get('/auth/staff').catch(() => ({ data: [] })),
        API.get('/auth/users').catch(() => ({ data: [] })),
        API.get('/warehouse').catch(() => ({ data: { batches: [], totalStoredWeight: 0, totalStoredItems: 0 } })),
        API.get('/centers').catch(() => ({ data: [] }))
      ]);

      setRequests(reqRes.data);
      setStaff(staffRes.data);
      setUsers(usersRes.data);
      setWarehouseData(whRes.data);
      setCenters(centersRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    if (!selectedBatch && warehouseData.batches.length === 0) {
      alert('No warehouse batch available for dispatch.');
      return;
    }
    const bId = selectedBatch || warehouseData.batches[0]?.batchCode || warehouseData.batches[0]?._id;
    try {
      setUpdateMsg('Dispatching batch to authorized recycling centre...');
      const res = await API.post('/warehouse/dispatch', {
        batchId: bId,
        recyclingCentre: selectedCenter
      });
      setUpdateMsg(res.data.msg);
      fetchData(); // Refresh data
      setTimeout(() => setUpdateMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.msg || 'Dispatch failed.');
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      setUpdateMsg('Updating status...');
      const res = await API.put(`/pickups/${requestId}/status`, { status: newStatus });
      setRequests(requests.map(r => r._id === requestId ? res.data : r));
      setUpdateMsg(`Status updated to "${newStatus}"! Points awarded if recycled.`);
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

                        {/* Assign Staff Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Staff:</span>
                          <select
                            className="form-select"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: 'auto' }}
                            value={req.assignedStaff || ''}
                            onChange={(e) => {
                              const selected = staff.find(s => s._id === e.target.value);
                              handleAssignStaff(req._id, e.target.value, selected ? selected.name : 'Staff');
                            }}
                          >
                            <option value="">-- Assign Staff --</option>
                            {staff.map(s => (
                              <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                            ))}
                          </select>
                        </div>

                        {/* Status update buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Update Status:</span>
                          {['pending', 'verified', 'assigned', 'collected', 'warehouse', 'recycled'].map(st => (
                            <button
                              key={st}
                              disabled={req.status === st}
                              onClick={() => handleStatusChange(req._id, st)}
                              style={{
                                background: req.status === st ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                border: req.status === st ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                                color: req.status === st ? '#fff' : 'var(--text-muted)',
                                opacity: req.status === st ? 0.6 : 1,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: req.status === st ? 'default' : 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {st}
                            </button>
                          ))}
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
                    const assignedTasks = requests.filter(r => r.assignedStaff === s._id);
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
      </div>
    </div>
  );
};

export default AdminDashboard;
