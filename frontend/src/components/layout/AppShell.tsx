import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard, FileSearch, Shield, Upload, ClipboardList,
  Settings, BookOpen, Users, ChevronDown, LogOut, Menu, X,
  Network, ScanSearch, HeartPulse, GitBranch, Activity,
} from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  // Officer
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['OFFICER', 'ADMIN', 'VIGILANCE'] },
  { to: '/dashboard', label: 'Applications', icon: <ClipboardList size={18} />, roles: ['OFFICER'], section: 'review' },

  // Bidder
  { to: '/my-tenders', label: 'My Tenders', icon: <FileSearch size={18} />, roles: ['BIDDER'] },

  // Intelligence
  { to: '/intelligence/bid-rigging', label: 'Bid-Rigging', icon: <Network size={18} />, roles: ['OFFICER', 'ADMIN', 'VIGILANCE'], section: 'intelligence' },
  { to: '/intelligence/doc-tamper', label: 'Doc Tamper', icon: <ScanSearch size={18} />, roles: ['OFFICER', 'ADMIN', 'VIGILANCE'], section: 'intelligence' },
  { to: '/intelligence/health-check', label: 'Health Check', icon: <HeartPulse size={18} />, roles: ['OFFICER', 'BIDDER'], section: 'intelligence' },
  { to: '/intelligence/cross-tender', label: 'Cross-Tender Intel', icon: <GitBranch size={18} />, roles: ['OFFICER', 'ADMIN', 'VIGILANCE'], section: 'intelligence' },

  // Admin
  { to: '/admin', label: 'Console', icon: <Settings size={18} />, roles: ['ADMIN'] },
  { to: '/admin/rules', label: 'Rule Config', icon: <BookOpen size={18} />, roles: ['ADMIN'] },
];

const ROLES = ['officer', 'admin', 'bidder', 'vigilance'] as const;

export function AppShell() {
  const { user, role, switchRole, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const navigate = useNavigate();

  const userRole = user?.role || role.toUpperCase();
  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const grouped: Record<string, NavItem[]> = {};
  filteredNav.forEach((item) => {
    const section = item.section || 'main';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(item);
  });

  const sectionLabels: Record<string, string> = {
    main: '',
    review: 'REVIEW',
    intelligence: 'INTELLIGENCE',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 -ml-64'
        } transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">
                Pramaan
              </h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                Bid Compliance AI
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              {sectionLabels[section] && (
                <p className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                  {sectionLabels[section]}
                </p>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link-active' : 'sidebar-link'
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Role Switcher */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <Users size={14} className="text-brand-700" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || 'Loading...'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  roleMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {roleMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-elevated border border-gray-200 py-1 animate-fade-in z-30">
                <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                  Switch Role
                </p>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setRoleMenuOpen(false);
                      navigate('/dashboard');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 capitalize ${
                      r === role ? 'text-brand-700 font-semibold bg-brand-50' : 'text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={18} className="text-gray-500" /> : <Menu size={18} className="text-gray-500" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
              <Activity size={12} className="text-green-600" />
              <span className="text-xs font-medium text-green-700">System Online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
