import React from 'react';
import { Home, Database, Shield, User, MessageSquare } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: (size: number) => React.ReactNode;
  minRole?: 'Verified' | 'Apex' | 'Overseer' | 'Root';
}

export const NAV_ITEMS: NavItem[] = [
  { 
    label: 'Dashboard', 
    path: '/dashboard', 
    icon: (size) => <Home size={size} /> 
  },
  { 
    label: 'Vaults', 
    path: '/vaults', 
    icon: (size) => <Database size={size} /> 
  },
  { 
    label: 'Communications', 
    path: '/communications', 
    icon: (size) => <MessageSquare size={size} /> 
  },
  { 
    label: 'System', 
    path: '/system', 
    icon: (size) => <Shield size={size} />,
    minRole: 'Overseer'
  },
  { 
    label: 'Account', 
    path: '/account', 
    icon: (size) => <User size={size} /> 
  },
];
