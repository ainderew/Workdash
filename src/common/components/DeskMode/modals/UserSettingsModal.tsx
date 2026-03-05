import React, { useEffect, useState } from 'react';
import { Palette, User, Volume2 } from 'lucide-react';
import {
  SettingsModalShell,
  type SettingsCategory,
  type SidebarItem,
} from './settings-primitives';
import AccountPanel from './user-settings/AccountPanel';
import AppearancePanel from './user-settings/AppearancePanel';
import AudioVideoPanel from './user-settings/AudioVideoPanel';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: SidebarItem[] = [
  { id: 'account', label: 'My Account', icon: <User size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'audio-video', label: 'Audio & Video', icon: <Volume2 size={16} /> },
];

function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>('account');

  useEffect(() => {
    if (isOpen) setActiveCategory('account');
  }, [isOpen]);

  return (
    <SettingsModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="User Settings"
      subtitle="Manage your account and preferences"
      categories={CATEGORIES}
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
    >
      {activeCategory === 'account' && <AccountPanel onClose={onClose} />}
      {activeCategory === 'appearance' && <AppearancePanel />}
      {activeCategory === 'audio-video' && <AudioVideoPanel />}
    </SettingsModalShell>
  );
}

export default UserSettingsModal;
