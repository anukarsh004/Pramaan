import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Settings, Plus, Building2, Users, FileText, CheckCircle2,
  AlertTriangle, X,
} from 'lucide-react';

type ModalType = 'tender' | 'user' | 'bidder' | null;

export function ConsolePage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);

  // Form states
  const [tenderForm, setTenderForm] = useState({
    gem_bid_number: '', title: '', category: '', closing_date: '', estimated_value: '',
  });
  const [userForm, setUserForm] = useState({
    keycloak_sub: '', email: '', full_name: '', role: 'OFFICER',
  });
  const [bidderForm, setBidderForm] = useState({
    legal_name: '', pan_number: '', gstin: '', udyam_number: '', cin: '', registered_address: '',
  });
  const [successMsg, setSuccessMsg] = useState('');

  const { data: tenders } = useQuery({
    queryKey: ['admin-tenders'],
    queryFn: () => api.admin.getTenders(),
    retry: false,
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.getUsers(),
    retry: false,
  });

  const createTenderMut = useMutation({
    mutationFn: () => api.admin.createTender({
      ...tenderForm,
      estimated_value: tenderForm.estimated_value ? Number(tenderForm.estimated_value) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenders'] });
      setModal(null);
      setSuccessMsg('Tender created successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const createUserMut = useMutation({
    mutationFn: () => api.admin.createUser(userForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setModal(null);
      setSuccessMsg('User created successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const createBidderMut = useMutation({
    mutationFn: () => api.admin.createBidder({
      ...bidderForm,
      gstin: bidderForm.gstin || undefined,
      udyam_number: bidderForm.udyam_number || undefined,
      cin: bidderForm.cin || undefined,
      registered_address: bidderForm.registered_address || undefined,
    }),
    onSuccess: () => {
      setModal(null);
      setSuccessMsg('Bidder created successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const tendersList = tenders?.data || [];
  const usersList = users?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-gray-500 mt-1">Manage tenders, users, and bidders.</p>
        </div>
        <Settings size={20} className="text-gray-400" />
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 animate-fade-in">
          <CheckCircle2 size={16} className="text-green-600" />
          <span className="text-sm text-green-700">{successMsg}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setModal('tender')} className="card p-5 text-left hover:shadow-elevated transition-all duration-200 group">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText size={18} className="text-brand-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Create Tender</h3>
          <p className="text-xs text-gray-500 mt-1">Add a new procurement tender</p>
        </button>
        <button onClick={() => setModal('user')} className="card p-5 text-left hover:shadow-elevated transition-all duration-200 group">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users size={18} className="text-purple-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Create User</h3>
          <p className="text-xs text-gray-500 mt-1">Add officer, admin, or bidder user</p>
        </button>
        <button onClick={() => setModal('bidder')} className="card p-5 text-left hover:shadow-elevated transition-all duration-200 group">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Building2 size={18} className="text-emerald-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Register Bidder</h3>
          <p className="text-xs text-gray-500 mt-1">Register a new bidding entity</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenders */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Tenders ({tendersList.length})</h2>
          </div>
          <div className="card-body max-h-96 overflow-y-auto space-y-2">
            {tendersList.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No tenders yet</p>
            ) : (
              tendersList.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 font-mono">{t.gem_bid_number}</span>
                    <span className="text-xs text-gray-400">{t.category}</span>
                    <span className={`text-xs ${t.rule_set_id ? 'text-green-600' : 'text-amber-600'}`}>
                      {t.rule_set_id ? '✓ Rules' : '⚠ No rules'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Users */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Users ({usersList.length})</h2>
          </div>
          <div className="card-body max-h-96 overflow-y-auto space-y-2">
            {usersList.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No users yet</p>
            ) : (
              usersList.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {u.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="badge badge-low !bg-gray-100 !text-gray-600 !border-gray-200">
                    {u.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === 'tender' ? 'Create Tender' : modal === 'user' ? 'Create User' : 'Register Bidder'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {modal === 'tender' && (
              <div className="space-y-3">
                <div>
                  <label className="input-label">GeM Bid Number</label>
                  <input className="input" value={tenderForm.gem_bid_number} onChange={(e) => setTenderForm({ ...tenderForm, gem_bid_number: e.target.value })} placeholder="GEM/2025/B/123456" />
                </div>
                <div>
                  <label className="input-label">Title</label>
                  <input className="input" value={tenderForm.title} onChange={(e) => setTenderForm({ ...tenderForm, title: e.target.value })} placeholder="Supply of IT Equipment" />
                </div>
                <div>
                  <label className="input-label">Category</label>
                  <input className="input" value={tenderForm.category} onChange={(e) => setTenderForm({ ...tenderForm, category: e.target.value })} placeholder="IT Hardware" />
                </div>
                <div>
                  <label className="input-label">Closing Date</label>
                  <input type="date" className="input" value={tenderForm.closing_date} onChange={(e) => setTenderForm({ ...tenderForm, closing_date: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Estimated Value (₹)</label>
                  <input type="number" className="input" value={tenderForm.estimated_value} onChange={(e) => setTenderForm({ ...tenderForm, estimated_value: e.target.value })} placeholder="500000" />
                </div>
                <button onClick={() => createTenderMut.mutate()} className="btn-primary w-full" disabled={createTenderMut.isPending}>
                  {createTenderMut.isPending ? 'Creating…' : 'Create Tender'}
                </button>
              </div>
            )}

            {modal === 'user' && (
              <div className="space-y-3">
                <div>
                  <label className="input-label">Full Name</label>
                  <input className="input" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="John Smith" />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input type="email" className="input" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="input-label">Keycloak Subject</label>
                  <input className="input" value={userForm.keycloak_sub} onChange={(e) => setUserForm({ ...userForm, keycloak_sub: e.target.value })} placeholder="auth-subject-id" />
                </div>
                <div>
                  <label className="input-label">Role</label>
                  <select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="OFFICER">Officer</option>
                    <option value="ADMIN">Admin</option>
                    <option value="BIDDER">Bidder</option>
                    <option value="VIGILANCE">Vigilance</option>
                  </select>
                </div>
                <button onClick={() => createUserMut.mutate()} className="btn-primary w-full" disabled={createUserMut.isPending}>
                  {createUserMut.isPending ? 'Creating…' : 'Create User'}
                </button>
              </div>
            )}

            {modal === 'bidder' && (
              <div className="space-y-3">
                <div>
                  <label className="input-label">Legal Name</label>
                  <input className="input" value={bidderForm.legal_name} onChange={(e) => setBidderForm({ ...bidderForm, legal_name: e.target.value })} placeholder="Acme Corp Pvt Ltd" />
                </div>
                <div>
                  <label className="input-label">PAN Number</label>
                  <input className="input" value={bidderForm.pan_number} onChange={(e) => setBidderForm({ ...bidderForm, pan_number: e.target.value })} placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label className="input-label">GSTIN (optional)</label>
                  <input className="input" value={bidderForm.gstin} onChange={(e) => setBidderForm({ ...bidderForm, gstin: e.target.value })} placeholder="29ABCDE1234F1Z5" />
                </div>
                <div>
                  <label className="input-label">Udyam Number (optional)</label>
                  <input className="input" value={bidderForm.udyam_number} onChange={(e) => setBidderForm({ ...bidderForm, udyam_number: e.target.value })} placeholder="UDYAM-KA-01-0012345" />
                </div>
                <button onClick={() => createBidderMut.mutate()} className="btn-primary w-full" disabled={createBidderMut.isPending}>
                  {createBidderMut.isPending ? 'Registering…' : 'Register Bidder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
