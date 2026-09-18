import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function NotificationCenter() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Mocking notifications as there's no endpoint
  const notifications = [
    {
      id: '1',
      title: 'New Bid Application',
      message: 'A new bid was submitted for Solar Plant O&M by SmartTech Solutions.',
      time: '2 hours ago',
      read: false,
      type: 'info',
      link: '/cases/app-101'
    },
    {
      id: '2',
      title: 'High Risk Flag',
      message: 'Application app-101 has a high risk anomaly (Blacklist check failed).',
      time: '5 hours ago',
      read: false,
      type: 'warning',
      link: '/cases/app-101'
    },
    {
      id: '3',
      title: 'Tender Closing Soon',
      message: 'Tender "Server Infrastructure Upgrade" is closing in 24 hours.',
      time: '1 day ago',
      read: true,
      type: 'alert',
      link: '/dashboard'
    }
  ];

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markAllRead = () => {
    // In a real app, this would call an API
    console.log('Marking all as read');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Updates and alerts for your assigned cases.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="block rounded-md border-gray-300 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread only</option>
          </select>
          <button 
            onClick={markAllRead}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <li className="px-6 py-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900">All caught up</h3>
                <p className="mt-1 text-sm text-gray-500">You don't have any new notifications at the moment.</p>
              </li>
            ) : (
            filtered.map((notification) => (
              <li key={notification.id} className={notification.read ? 'bg-white' : 'bg-blue-50'}>
                <a href={notification.link} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${notification.read ? 'text-gray-900' : 'text-primary-700'} truncate`}>
                        {notification.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        {!notification.read && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {notification.message}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
