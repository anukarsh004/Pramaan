import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Network, AlertTriangle, MapPin, CreditCard, RotateCcw, DollarSign,
  ArrowRight, Shield, Users,
} from 'lucide-react';

const RELATIONSHIP_COLORS: Record<string, string> = {
  SHARED_ADDRESS: 'bg-red-500',
  PAN_CLUSTER: 'bg-orange-500',
  ROTATION_PATTERN: 'bg-purple-500',
  PRICE_COORDINATION: 'bg-rose-600',
};

const RELATIONSHIP_ICONS: Record<string, React.ReactNode> = {
  SHARED_ADDRESS: <MapPin size={14} />,
  PAN_CLUSTER: <CreditCard size={14} />,
  ROTATION_PATTERN: <RotateCcw size={14} />,
  PRICE_COORDINATION: <DollarSign size={14} />,
};

export function BidRiggingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bid-rigging'],
    queryFn: () => api.intelligence.getBidRigging(),
    retry: false,
  });

  const report = data?.data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
          <Network size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bid-Rigging Detection</h1>
          <p className="text-gray-500 text-sm">
            Cross-tender analysis for suspicious bidder relationships
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !report ? (
        <div className="card p-12 text-center">
          <Network size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Unable to load analysis. Ensure the backend is running.</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="stat-label">Tenders Analyzed</span>
              <span className="stat-value">{report.total_tenders_analyzed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Bidders Analyzed</span>
              <span className="stat-value">{report.total_bidders_analyzed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Suspect Clusters</span>
              <span className="stat-value text-red-600">{report.suspect_clusters.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Overall Risk</span>
              <span className={`badge badge-${report.overall_risk.toLowerCase()} text-sm mt-1`}>
                {report.overall_risk}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 border-amber-200 bg-amber-50/30">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suspect Clusters */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Users size={16} className="text-red-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Suspect Clusters ({report.suspect_clusters.length})
                </h2>
              </div>
              <div className="card-body space-y-3">
                {report.suspect_clusters.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No clusters detected</p>
                ) : (
                  report.suspect_clusters.map((cluster: any) => (
                    <div key={cluster.cluster_id} className="p-4 rounded-xl border border-red-100 bg-red-50/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-gray-400">{cluster.cluster_id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-700">
                            Risk: {cluster.risk_score}/100
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full"
                              style={{ width: `${cluster.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bidder names */}
                      <div className="space-y-1.5 mb-3">
                        {cluster.bidder_names.map((name: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-red-700">{i + 1}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Signals */}
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.signals.map((signal: string) => (
                          <span key={signal} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-white bg-red-600">
                            {RELATIONSHIP_ICONS[signal]}
                            {signal.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Relationship Edges */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Network size={16} className="text-purple-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Relationship Map ({report.relationship_edges.length})
                </h2>
              </div>
              <div className="card-body space-y-2 max-h-[600px] overflow-y-auto">
                {report.relationship_edges.map((edge: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${RELATIONSHIP_COLORS[edge.relationship_type] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900 truncate">{edge.source_name}</span>
                        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">{edge.target_name}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{edge.details}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-mono text-gray-400">
                        {(edge.strength * 100).toFixed(0)}%
                      </span>
                      <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${RELATIONSHIP_COLORS[edge.relationship_type] || 'bg-gray-400'}`}
                          style={{ width: `${edge.strength * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
