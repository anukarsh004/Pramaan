import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BookOpen, Plus, Check, X, AlertTriangle } from 'lucide-react';

export function RuleConfigPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCheckType, setNewCheckType] = useState({ name: '', source_system: 'DOCUMENT', mandatory: true });
  const [successMsg, setSuccessMsg] = useState('');

  const { data: checkTypes } = useQuery({
    queryKey: ['admin-check-types'],
    queryFn: () => api.admin.getCheckTypes(),
    retry: false,
  });

  const { data: tenders } = useQuery({
    queryKey: ['admin-tenders'],
    queryFn: () => api.admin.getTenders(),
    retry: false,
  });

  const createCheckTypeMut = useMutation({
    mutationFn: () => api.admin.createCheckType(newCheckType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-check-types'] });
      setShowCreate(false);
      setNewCheckType({ name: '', source_system: 'DOCUMENT', mandatory: true });
      setSuccessMsg('Check type created');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const types = checkTypes?.data || [];
  const tendersList = tenders?.data || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rule Configuration</h1>
          <p className="text-gray-500 mt-1">Manage check types and eligibility rule sets.</p>
        </div>
        <BookOpen size={20} className="text-gray-400" />
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 animate-fade-in">
          <Check size={16} className="text-green-600" />
          <span className="text-sm text-green-700">{successMsg}</span>
        </div>
      )}

      {/* Check Types */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Check Types ({types.length})</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Add Check Type
          </button>
        </div>
        <div className="card-body">
          {types.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No check types configured</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>Mandatory</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((ct) => (
                    <tr key={ct.id}>
                      <td className="font-medium text-gray-900">{ct.name}</td>
                      <td>
                        <span className="chip chip-pending">{ct.source_system}</span>
                      </td>
                      <td>
                        {ct.mandatory ? (
                          <Check size={14} className="text-green-600" />
                        ) : (
                          <X size={14} className="text-gray-400" />
                        )}
                      </td>
                      <td className="font-mono text-xs text-gray-400">{ct.id.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tenders with Rule Sets */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900">Tender Rule Set Assignments</h2>
        </div>
        <div className="card-body space-y-2">
          {tendersList.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No tenders found</p>
          ) : (
            tendersList.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.gem_bid_number}</p>
                </div>
                {t.rule_set_id ? (
                  <span className="chip chip-pass">
                    <Check size={12} /> Rules assigned
                  </span>
                ) : (
                  <span className="chip chip-pending">
                    <AlertTriangle size={12} /> No rules
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Check Type Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Check Type</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Name</label>
                <input
                  className="input"
                  value={newCheckType.name}
                  onChange={(e) => setNewCheckType({ ...newCheckType, name: e.target.value })}
                  placeholder="PAN Verification"
                />
              </div>
              <div>
                <label className="input-label">Source System</label>
                <select
                  className="input"
                  value={newCheckType.source_system}
                  onChange={(e) => setNewCheckType({ ...newCheckType, source_system: e.target.value })}
                >
                  <option value="DOCUMENT">Document</option>
                  <option value="API">API</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCheckType.mandatory}
                  onChange={(e) => setNewCheckType({ ...newCheckType, mandatory: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-700">Mandatory check</span>
              </label>
              <button
                onClick={() => createCheckTypeMut.mutate()}
                className="btn-primary w-full"
                disabled={createCheckTypeMut.isPending}
              >
                {createCheckTypeMut.isPending ? 'Creating…' : 'Create Check Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
