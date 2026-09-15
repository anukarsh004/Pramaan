import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, FileText, CheckCircle2, Clock, XCircle, Package } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'intake_pending', label: 'Documents Required' },
  { key: 'intake_complete', label: 'Submitted' },
  { key: 'processing', label: 'Under Review' },
  { key: 'ready_for_review', label: 'Officer Review' },
  { key: 'closed', label: 'Decision Made' },
];

export function StatusPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['bidder-app', applicationId],
    queryFn: () => api.bidder.getApplication(applicationId!),
    enabled: !!applicationId,
    retry: false,
  });

  const detail = data?.data;
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === detail?.status);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Application Status</h1>
          <p className="text-sm text-gray-500">{detail?.tender_title || 'Loading…'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton h-48 w-full rounded-xl" />
      ) : detail ? (
        <>
          {/* Status Stepper */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              {STATUS_STEPS.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                          ? 'bg-brand-100 text-brand-700 ring-4 ring-brand-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 size={18} />
                        ) : isCurrent ? (
                          <Clock size={18} />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium text-center max-w-[80px] leading-tight ${
                        isCurrent ? 'text-brand-700' : isCompleted ? 'text-green-700' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded-full ${
                        i < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Submitted info */}
          {detail.submitted_at && (
            <div className="card p-4 flex items-center gap-3 bg-green-50 border-green-200">
              <CheckCircle2 size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Application Submitted</p>
                <p className="text-xs text-green-600">
                  {new Date(detail.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Package size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                Uploaded Documents ({detail.documents.length})
              </h2>
            </div>
            <div className="card-body">
              {detail.documents.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {detail.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <FileText size={16} className="text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {doc.doc_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-400">Version {doc.version}</p>
                      </div>
                      <div className="text-right">
                        <span className={`chip ${
                          doc.extraction_status === 'completed' ? 'chip-pass' : 'chip-pending'
                        }`}>
                          {doc.extraction_status}
                        </span>
                        {doc.extraction_confidence != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            {(doc.extraction_confidence * 100).toFixed(0)}% confidence
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <XCircle size={48} className="mx-auto text-red-300 mb-4" />
          <p className="text-gray-500">Application not found</p>
        </div>
      )}
    </div>
  );
}
