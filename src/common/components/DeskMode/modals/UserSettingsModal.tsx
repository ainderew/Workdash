import React, { useEffect, useState } from 'react';
import { Cog, Link2, Palette, Trophy, User, Volume2 } from 'lucide-react';
import {
  SettingsModalShell,
  type SettingsCategory,
  type SidebarItem,
} from './settings-primitives';
import AccountPanel from './user-settings/AccountPanel';
import AchievementsPanel from './user-settings/AchievementsPanel';
import AppearancePanel from './user-settings/AppearancePanel';
import AudioVideoPanel from './user-settings/AudioVideoPanel';
import ConnectionsPanel from './user-settings/ConnectionsPanel';
import GeneralPanel from './user-settings/GeneralPanel';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: SidebarItem[] = [
  { id: 'general', label: 'General', icon: <Cog size={16} /> },
  { id: 'account', label: 'My Account', icon: <User size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'audio-video', label: 'Audio & Video', icon: <Volume2 size={16} /> },
  { id: 'connections', label: 'Connections', icon: <Link2 size={16} /> },
  { id: 'achievements', label: 'Achievements', icon: <Trophy size={16} /> },
];

function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>('general');

  useEffect(() => {
    if (isOpen) setActiveCategory('general');
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
      {activeCategory === 'general' && <GeneralPanel />}
      {activeCategory === 'account' && <AccountPanel onClose={onClose} />}
      {activeCategory === 'appearance' && <AppearancePanel />}
      {activeCategory === 'audio-video' && <AudioVideoPanel />}
      {activeCategory === 'connections' && <ConnectionsPanel />}
      {activeCategory === 'achievements' && <AchievementsPanel />}
    </SettingsModalShell>
  );
}

export default UserSettingsModal;
