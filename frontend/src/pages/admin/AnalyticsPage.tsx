import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function AnalyticsPage() {
  // We'll mock some of the trend data since we don't have a dedicated stats endpoint yet
  // but we can pull real data for some high-level metrics if available.

  const { data: tendersRes } = useQuery({
    queryKey: ['tenders'],
    queryFn: () => api.getTenders(),
  });

  const tenders = tendersRes?.data || [];
  const activeTenders = tenders.filter(t => new Date(t.closing_date) > new Date()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics & MIS</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide compliance trends and cycle-time metrics.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Active Tenders</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{activeTenders}</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Avg Cycle Time</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">2.4 days</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">142</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Disqualification Rate</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">14%</dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Cycle Time Trends</h3>
          <div className="h-64 border border-gray-100 rounded-lg flex items-end justify-between px-4 pb-4 pt-8 bg-gray-50/50">
            {/* CSS Bar Chart */}
            {[
              { label: 'Jan', val: 3.2, max: 4.0 },
              { label: 'Feb', val: 2.8, max: 4.0 },
              { label: 'Mar', val: 3.5, max: 4.0 },
              { label: 'Apr', val: 2.4, max: 4.0 },
              { label: 'May', val: 1.8, max: 4.0 },
              { label: 'Jun', val: 1.5, max: 4.0 },
              { label: 'Jul', val: 1.2, max: 4.0 },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center group relative w-full px-1">
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity pointer-events-none whitespace-nowrap">
                  {d.val} days
                </div>
                <div className="w-full bg-blue-100 rounded-t-sm relative flex items-end justify-center h-48">
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 group-hover:bg-blue-600"
                    style={{ height: `${(d.val / d.max) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">Avg days from submission to decision</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Common Failure Reasons</h3>
          {/* Mock bar chart placeholder */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Expired GST Certificate</span>
                <span className="font-medium">42%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Name Mismatch (PAN vs Udyam)</span>
                <span className="font-medium">28%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-red-400 h-2 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Blacklisted in another CPSE</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-red-300 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Missing Mandatory Document</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-red-300 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
