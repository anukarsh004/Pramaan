import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { FileSearch, Calendar, ArrowRight, Upload, BriefcaseBusiness, Clock3, BadgeCheck } from 'lucide-react';

export function MyTendersPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-tenders'],
    queryFn: () => api.bidder.getMyTenders(),
    retry: false,
  });

  const { data: availableData } = useQuery({
    queryKey: ['available-tenders'],
    queryFn: () => api.bidder.getAvailableTenders(),
    retry: false,
  });

  const tenders = data?.data ?? [];
  const openTenders = availableData?.data ?? [];
  const pendingUploads = tenders.filter((item) => item.status === 'intake_pending').length;
  const submitted = tenders.filter((item) => item.status !== 'intake_pending').length;
  const nextDeadline = tenders.reduce<string | null>((soonest, item) => {
    const candidate = item.closing_date;
    if (!soonest || new Date(candidate).getTime() < new Date(soonest).getTime()) {
      return candidate;
    }
    return soonest;
  }, null);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-100">Bidder hub</p>
            <h1 className="mt-2 text-3xl font-bold">My Tender Dashboard</h1>
          </div>
          <button
            className="btn bg-white text-brand-700 hover:bg-brand-50"
            onClick={() => navigate('/my-tenders')}
          >
            <Upload size={16} />
            Upload Documents
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-3">
            <span className="stat-label">Applications</span>
            <BriefcaseBusiness size={18} className="text-brand-600" />
          </div>
          <div className="stat-value">{tenders.length}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-3">
            <span className="stat-label">Upload pending</span>
            <Clock3 size={18} className="text-amber-600" />
          </div>
          <div className="stat-value text-amber-600">{pendingUploads}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-3">
            <span className="stat-label">Next deadline</span>
            <BadgeCheck size={18} className="text-emerald-600" />
          </div>
          <div className="stat-value text-sm text-gray-700">
            {nextDeadline ? new Date(nextDeadline).toLocaleDateString() : 'No active bids'}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">My Applications</h2>
              <span className="text-xs text-gray-500">{submitted} submitted</span>
            </div>
            <div className="card-body space-y-3">
              {tenders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <FileSearch size={42} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No bid applications yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your tender assignments will appear here once an officer or admin creates the bid.
                  </p>
                </div>
              ) : (
                tenders.map((item) => (
                  <div
                    key={item.application_id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{item.tender_title}</h3>
                          <span className={`chip ${
                            item.status === 'closed' ? 'chip-pass' : 'chip-pending'
                          }`}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-gray-500">{item.gem_bid_number}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            Closes {new Date(item.closing_date).toLocaleDateString()}
                          </div>
                          {item.submitted_at && (
                            <div>Submitted {new Date(item.submitted_at).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => navigate(`/status/${item.application_id}`)}
                          className="btn-secondary btn-sm"
                        >
                          Status
                        </button>
                        {item.status === 'intake_pending' && (
                          <button
                            onClick={() => navigate(`/upload/${item.application_id}`)}
                            className="btn-primary btn-sm"
                          >
                            <Upload size={12} /> Upload Docs
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-gray-900">Upload Checklist</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3">
                <p className="text-sm font-semibold text-brand-800">Recommended documents</p>
              </div>
              {['PAN Card', 'GST Certificate', 'Udyam Certificate', 'MCA Extract / CIN', 'OEM Authorization', 'Experience Certificate'].map((doc, idx) => (
                <div key={doc} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-700 shadow-sm">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{doc}</span>
                  </div>
                  <span className="text-xs text-gray-500">Ready</span>
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Open bids</p>
                <div className="mt-3 space-y-2">
                  {openTenders.slice(0, 3).map((tender) => (
                    <button
                      key={tender.id}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-brand-200"
                      onClick={() => navigate('/my-tenders')}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{tender.title}</p>
                        <p className="text-[11px] text-gray-500">Closes {new Date(tender.closing_date).toLocaleDateString()}</p>
                      </div>
                      <ArrowRight size={16} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
