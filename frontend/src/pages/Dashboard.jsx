import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import GlassCard from '../components/GlassCard';
import EwasteChart from '../components/EwasteChart';

const Dashboard = ({ user, setUser }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const [feedbackData, setFeedbackData] = useState({
    requestId: null,
    rating: 5,
    comment: ''
  });

  const [formData, setFormData] = useState({
    category: 'Mobile Phones',
    description: '',
    weight: '',
    address: user?.address || '',
    userPhone: user?.phone || '',
    pickupDate: ''
  });

  const fetchUserRequests = async () => {
    try {
      const res = await API.get('/pickups');
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await API.get('/auth/user');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setProfileData({
        name: res.data.name || '',
        phone: res.data.phone || '',
        address: res.data.address || ''
      });
      setFormData(prev => ({
        ...prev,
        address: prev.address || res.data.address || '',
        userPhone: prev.userPhone || res.data.phone || ''
      }));
    } catch (err) {
      console.error('Error updating user profile:', err);
    }
  };

  useEffect(() => {
    fetchUserRequests();
    fetchUserProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/auth/profile', profileData);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setShowProfileModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await API.post('/pickups', formData);
      setRequests([res.data, ...requests]);
      setMsg({ type: 'success', text: 'E-Waste pickup request submitted! Admin & Staff will verify and process your request.' });
      setFormData({
        category: 'Mobile Phones',
        description: '',
        weight: '',
        address: user?.address || '',
        userPhone: user?.phone || '',
        pickupDate: ''
      });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.msg || 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackData.requestId) return;
    try {
      const res = await API.post(`/pickups/${feedbackData.requestId}/feedback`, {
        rating: feedbackData.rating,
        comment: feedbackData.comment
      });
      setRequests(requests.map(r => r._id === feedbackData.requestId ? res.data : r));
      setFeedbackData({ requestId: null, rating: 5, comment: '' });
      alert('Thank you for providing your feedback!');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to submit feedback');
    }
  };

  const handleRedeem = async (points, title, code) => {
    if ((user?.ecoPoints || 0) < points) {
      alert(`Insufficient Eco Points! You need ${points} points to redeem "${title}".`);
      return;
    }

    if (!window.confirm(`Redeem ${points} points for "${title}"?`)) {
      return;
    }

    try {
      const res = await API.post('/auth/redeem', { points });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      alert(`🎉 Voucher Redeemed! Your code for ${title} is: ${code}`);
    } catch (err) {
      alert(err.response?.data?.msg || 'Redemption failed.');
    }
  };

  const totalWeight = requests.reduce((acc, req) => acc + (req.weight || 0), 0);
  const recycledCount = requests.filter(r => r.status === 'recycled').length;

  const getStatusStepIndex = (status) => {
    switch (status) {
      case 'pending': return 1;
      case 'verified': return 2;
      case 'assigned': return 3;
      case 'collected': return 4;
      case 'warehouse': return 5;
      case 'recycled': return 6;
      default: return 1;
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>
              User Portal Dashboard 🌿
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Submit doorstep e-waste requests, track pickup status & view eco-rewards
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowProfileModal(!showProfileModal)}
              style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
            >
              👤 Manage Profile
            </button>

            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.75rem 1.25rem',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '1.75rem' }}>🌱</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eco Points</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>{user?.ecoPoints || 0} Pts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Modal */}
        {showProfileModal && (
          <GlassCard style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>👤 Update Your Profile Details</h3>
            <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Default Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="House number, street, city"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn-primary">Save Profile</button>
                <button type="button" className="btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Requests</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', marginTop: '0.25rem' }}>{requests.length}</div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Submitted Weight</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#38bdf8', marginTop: '0.25rem' }}>{totalWeight.toFixed(1)} kg</div>
          </GlassCard>

          <GlassCard>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recycled Items</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#34d399', marginTop: '0.25rem' }}>{recycledCount}</div>
          </GlassCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
          {/* Submit E-Waste Request Form */}
          <div>
            <GlassCard>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📦</span> Submit E-Waste Pickup Request
              </h3>

              {msg.text && (
                <div style={{
                  background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  color: msg.type === 'success' ? '#34d399' : '#f87171',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  {msg.text}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">E-Waste Category</label>
                  <select name="category" className="form-select" value={formData.category} onChange={handleChange} required>
                    <option value="Mobile Phones">Mobile Phones & Tablets</option>
                    <option value="Laptops">Laptops & Computers</option>
                    <option value="Batteries">Batteries & Power Packs</option>
                    <option value="Chargers">Chargers, Cables & Adapters</option>
                    <option value="Televisions">Televisions & Displays</option>
                    <option value="Appliances">Home Electronics & Appliances</option>
                    <option value="Others">Other Electronic Items</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Weight (in kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    name="weight"
                    className="form-input"
                    placeholder="e.g. 1.5"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                  />
                  <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    💡 You earn 10 Eco Points per kg recycled!
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Device Details</label>
                  <input
                    type="text"
                    name="description"
                    className="form-input"
                    placeholder="e.g. 2 broken Android phones & 1 laptop charger"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Phone Number</label>
                  <input
                    type="text"
                    name="userPhone"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={formData.userPhone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Doorstep Pickup Address</label>
                  <textarea
                    name="address"
                    className="form-textarea"
                    rows="2"
                    placeholder="House/Apartment number, street, city"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Pickup Date</label>
                  <input
                    type="date"
                    name="pickupDate"
                    className="form-input"
                    value={formData.pickupDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Submitting Request...' : 'Submit Pickup Request'}
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Request Status Tracking & Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <GlassCard>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
                Track Pickup Request Status 🔍
              </h3>

              {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading status...</p>
              ) : requests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  No pickup requests submitted yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {requests.map((req) => {
                    const stepIdx = getStatusStepIndex(req.status);
                    return (
                      <div
                        key={req._id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '14px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{req.category}</strong>
                            <span className={`badge badge-${req.status}`} style={{ marginLeft: '0.5rem', textTransform: 'uppercase' }}>
                              {req.status}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {new Date(req.pickupDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {req.description} ({req.weight} kg)
                        </div>

                        {req.assignedStaffName && (
                          <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                            👤 Assigned Collector: <strong>{req.assignedStaffName}</strong>
                          </div>
                        )}

                        {/* Interactive Status Timeline */}
                        <div style={{
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.2rem'
                        }}>
                          {[
                            { label: 'Submitted', idx: 1 },
                            { label: 'Verified', idx: 2 },
                            { label: 'Assigned', idx: 3 },
                            { label: 'Collected', idx: 4 },
                            { label: 'Warehouse', idx: 5 },
                            { label: 'Recycled', idx: 6 }
                          ].map((step) => (
                            <div
                              key={step.label}
                              style={{
                                textAlign: 'center',
                                flex: 1,
                                color: stepIdx >= step.idx ? '#34d399' : 'var(--text-dim)',
                                fontWeight: stepIdx >= step.idx ? '700' : '400'
                              }}
                            >
                              <div>{stepIdx >= step.idx ? '●' : '○'}</div>
                              <div>{step.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Feedback Section */}
                        {req.feedback && req.feedback.rating > 0 ? (
                          <div style={{ fontSize: '0.8rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                            ⭐ Feedback: {req.feedback.rating}/5 — "{req.feedback.comment}"
                          </div>
                        ) : (req.status === 'collected' || req.status === 'warehouse' || req.status === 'recycled') ? (
                          <button
                            onClick={() => setFeedbackData({ requestId: req._id, rating: 5, comment: '' })}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', alignSelf: 'flex-start' }}
                          >
                            💬 Provide Feedback
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Submit Feedback Modal/Card */}
            {feedbackData.requestId && (
              <GlassCard style={{ border: '1px solid #34d399' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>💬 Provide Service Feedback</h4>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="form-group">
                    <label className="form-label">Rating (1 to 5 Stars)</label>
                    <select
                      className="form-select"
                      value={feedbackData.rating}
                      onChange={(e) => setFeedbackData({ ...feedbackData, rating: Number(e.target.value) })}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                      <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
                      <option value="3">⭐⭐⭐ (3 - Average)</option>
                      <option value="2">⭐⭐ (2 - Poor)</option>
                      <option value="1">⭐ (1 - Terrible)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Comments</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Prompt collection, staff behaviour, etc."
                      value={feedbackData.comment}
                      onChange={(e) => setFeedbackData({ ...feedbackData, comment: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Submit Feedback</button>
                    <button type="button" className="btn-secondary" onClick={() => setFeedbackData({ requestId: null, rating: 5, comment: '' })}>Cancel</button>
                  </div>
                </form>
              </GlassCard>
            )}

            <GlassCard>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                E-Waste Breakdown Analytics
              </h3>
              <EwasteChart requests={requests} />
            </GlassCard>
          </div>
        </div>

        {/* Eco Rewards Store */}
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>🎁 Redeem Eco Rewards</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🪴</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Organic Plant Voucher</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Get 1 indoor plant at local nurseries.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#34d399', fontWeight: '700' }}>100 Points</span>
                <button
                  className="btn-outline-emerald"
                  onClick={() => handleRedeem(100, 'Organic Plant Voucher', 'ECOPLANT100')}
                >
                  Redeem
                </button>
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛒</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>₹200 Green Supermarket Coupon</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Valid on organic produce & groceries.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#34d399', fontWeight: '700' }}>200 Points</span>
                <button
                  className="btn-outline-emerald"
                  onClick={() => handleRedeem(200, '₹200 Green Supermarket Coupon', 'GREEN200')}
                >
                  Redeem
                </button>
              </div>
            </GlassCard>

            <GlassCard>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Solar Accessory Discount</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>20% OFF solar powerbanks & lights.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#34d399', fontWeight: '700' }}>300 Points</span>
                <button
                  className="btn-outline-emerald"
                  onClick={() => handleRedeem(300, 'Solar Accessory Discount', 'SOLAR20')}
                >
                  Redeem
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
