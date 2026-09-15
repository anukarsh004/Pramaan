import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  ArrowLeft, ShieldCheck, ShieldAlert, Hash, Clock, User, Link2,
} from 'lucide-react';

export function AuditTrailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['audit', applicationId],
    queryFn: () => api.getAuditTrail(applicationId!),
    enabled: !!applicationId,
    retry: false,
  });

  const trail = data?.data;
  const events = trail?.events || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500">
            Application: {applicationId?.slice(0, 8)}…
          </p>
        </div>
        {trail && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            trail.chain_verified
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {trail.chain_verified ? (
              <ShieldCheck size={14} />
            ) : (
              <ShieldAlert size={14} />
            )}
            <span className="text-xs font-semibold">
              {trail.chain_verified ? 'Chain Verified' : 'Chain Broken!'}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No audit events found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-0">
            {events.map((event, i) => (
              <div key={event.id} className="relative pl-14 pb-6">
                {/* Dot */}
                <div className={`absolute left-[18px] w-5 h-5 rounded-full border-2 border-white shadow-sm ${
                  event.action.includes('DECISION') ? 'bg-brand-600' :
                  event.action.includes('ERROR') ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />

                <div className="card p-4 hover:shadow-elevated transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="chip chip-pending !text-[10px]">{event.action}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <User size={10} />
                        {event.actor.slice(0, 8)}…
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(event.event_at).toLocaleString()}
                    </span>
                  </div>

                  {/* State changes */}
                  <div className="flex gap-4 text-xs">
                    {event.before_state && (
                      <div className="flex-1">
                        <p className="text-gray-400 mb-1">Before:</p>
                        <pre className="bg-red-50 text-red-700 p-2 rounded text-[10px] overflow-x-auto font-mono">
                          {JSON.stringify(event.before_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {event.after_state && (
                      <div className="flex-1">
                        <p className="text-gray-400 mb-1">After:</p>
                        <pre className="bg-green-50 text-green-700 p-2 rounded text-[10px] overflow-x-auto font-mono">
                          {JSON.stringify(event.after_state, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Hash */}
                  <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400 font-mono">
                    <Hash size={10} />
                    {event.event_hash.slice(0, 16)}…
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
