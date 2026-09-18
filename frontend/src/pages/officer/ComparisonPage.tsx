import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api, ApplicationItem } from '../../lib/api';

export function ComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenderId = searchParams.get('tender_id') || 't-1';

  const { data: tendersRes } = useQuery({
    queryKey: ['tenders'],
    queryFn: () => api.getTenders(),
  });

  const { data: appsRes, isLoading } = useQuery({
    queryKey: ['applications', tenderId],
    queryFn: () => api.getApplications({ tender_id: tenderId }),
    enabled: !!tenderId,
  });

  const tenders = tendersRes?.data || [];
  const applications = appsRes?.data || [];

  const handleTenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ tender_id: e.target.value });
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bidder Comparison</h1>
          <p className="text-sm text-gray-500 mt-1">Side-by-side comparison of bidders for a tender.</p>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="tender-select" className="text-sm font-medium text-gray-700">Tender:</label>
          <select
            id="tender-select"
            value={tenderId}
            onChange={handleTenderChange}
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.gem_bid_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
          <p className="mt-1 text-sm text-gray-500">No applications found for this tender.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky left-0 bg-gray-50 z-10">
                  Feature / Check
                </th>
                {applications.map(app => (
                  <th key={app.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[250px]">
                    {app.bidder_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white">
                  Compliance Score
                </td>
                {applications.map(app => (
                  <td key={`score-${app.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {app.overall_score !== null ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${app.overall_score >= 80 ? 'bg-green-100 text-green-800' : app.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {app.overall_score} / 100
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white">
                  Risk Level
                </td>
                {applications.map(app => (
                  <td key={`risk-${app.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`badge badge-${app.risk_level.toLowerCase()}`}>{app.risk_level}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white">
                  Status
                </td>
                {applications.map(app => (
                  <td key={`status-${app.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="capitalize">{app.status.replace(/_/g, ' ')}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white">
                  Submission Date
                </td>
                {applications.map(app => (
                  <td key={`date-${app.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'N/A'}
                  </td>
                ))}
              </tr>
              {/* Add a row for action buttons */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-gray-50">
                  Action
                </td>
                {applications.map(app => (
                  <td key={`action-${app.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="btn btn-secondary" onClick={() => window.location.href = `/cases/${app.id}`}>
                      View Details
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
