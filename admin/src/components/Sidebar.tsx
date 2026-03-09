import { STORAGE_KEYS } from '@/constants/app';
import { Paths } from '@/constants/path';
import { ChevronIcon } from '@/icons/chevron';
import { UserIcon } from '@/icons/user';
import { ServiceIcon } from '@/icons/service';
import { UserGroupIcon } from '@/icons/user-group';
import { LookupIcon } from '@/icons/lookup';
import { cn } from '@/libs/utils';
import { LoginOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    path: Paths.UserManagement,
    label: 'User management',
    icon: <UserIcon />,
  },
  {
    path: Paths.CategoryManagement,
    label: 'Category management',
    icon: <ServiceIcon />,
  }
  ,
  {
    path: Paths.RolesManagement,
    label: 'Roles management',
    icon: <UserGroupIcon />,
  }
  ,
  {
    path: Paths.SpecialtiesManagement,
    label: 'Specialties management',
    icon: <LookupIcon />,
  }
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    queryClient.clear();
    navigate(Paths.Login);
  };

  return (
    <div className="flex min-h-screen w-[300px] flex-col bg-[#0D1F2D] px-3 pt-[38px] pb-4 text-white shadow-[0px_8px_28px_0px_#0105114D]">
      {/* Logo */}
      <div className="mb-8 px-[18px]">
        <div className="flex items-center space-x-2.5">
          <img src="/logo.png" alt="logo" className="w-9" />
          <span className="text-[34px] font-medium">BO</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {sidebarItems.map(item => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 transition',
                isActive
                  ? 'text-[#B8D8C0]'
                  : 'text-[#FEFEFE80] hover:text-[#FEFEFE90]'
              )}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronIcon className="ml-auto" />
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex w-full cursor-pointer items-center space-x-3 rounded-lg px-4 py-3 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        <LoginOutlined />
        <span className="font-medium">Déconnexion</span>
      </button>
    </div>
  );
};
