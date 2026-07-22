import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { GuestLanding } from './pages/GuestLanding';

export function App() {
  const [viewMode, setViewMode] = useState<'guest' | 'admin'>('guest');

  return (
    <>
      {viewMode === 'guest' ? (
        <GuestLanding onGoToAdmin={() => setViewMode('admin')} />
      ) : (
        <AppShell onGoToGuest={() => setViewMode('guest')} />
      )}
    </>
  );
}

export default App;
