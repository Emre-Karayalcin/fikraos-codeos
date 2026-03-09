import React from 'react';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#0d1f2d]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 overflow-auto"
        style={{
          background:
            'linear-gradient(25deg, #253e46 -30%, #0d1f2d 60%, #0d1f2d 90%, #0d1f2d)',
        }}
      >
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
