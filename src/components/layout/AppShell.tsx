import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RightInspector } from './RightInspector';
import { Dashboard } from '../../pages/Dashboard';
import { Rooms } from '../../pages/Rooms';
import { Reservations } from '../../pages/Reservations';
import { CheckInOut } from '../../pages/CheckInOut';
import { Guests } from '../../pages/Guests';
import { BillingPage } from '../../pages/Billing';
import { Reports } from '../../pages/Reports';
import { User } from '../../types';
import { LoginModal } from '../auth/LoginModal';
import { CustomCursor } from '../ui/CustomCursor';

interface AppShellProps {
  onGoToGuest?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onGoToGuest }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    username: 'admin',
    fullName: 'Administrator',
    role: 'Admin',
  });

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <div className="h-screen bg-[#F5F2EC] text-[#1C1B18] flex flex-col font-sans overflow-hidden select-none">
      {/* Japandi Custom 3D Interactive Mouse Cursor */}
      <CustomCursor />

      {/* Simple Auth Gate Modal */}
      {!currentUser && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {/* Japandi 3-Panel Layout Container */}
      {currentUser && (
        <div className="flex flex-1 h-full overflow-hidden relative">
          {/* PANEL 1: LEFT SIDEBAR (Primary Navigation) */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* PANEL 2: CENTER MAIN CONTENT AREA */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-out h-full overflow-hidden ${
              sidebarCollapsed ? 'ml-20' : 'ml-64'
            }`}
          >
            {/* Header */}
            <Header activeTab={activeTab} currentUser={currentUser} onGoToGuest={onGoToGuest} />

            {/* Center Main Module Content */}
            <main className="flex-1 overflow-y-auto">
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'rooms' && <Rooms />}
              {activeTab === 'reservations' && <Reservations />}
              {activeTab === 'checkinout' && <CheckInOut />}
              {activeTab === 'guests' && <Guests />}
              {activeTab === 'billing' && <BillingPage />}
              {activeTab === 'reports' && <Reports />}
            </main>
          </div>

          {/* PANEL 3: RIGHT PANEL (Inspector, 2D Map Grid & Interactive Schedule Desk) */}
          <RightInspector onNavigate={setActiveTab} />
        </div>
      )}
    </div>
  );
};
