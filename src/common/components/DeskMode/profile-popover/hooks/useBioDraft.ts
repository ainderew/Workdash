import { useEffect, useMemo, useState } from 'react';
import type { ChatV2UserProfile } from '@/communication/chatV2/_types';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { toast } from 'sonner';
import { MAX_BIO_LENGTH } from '../constants';

export function useBioDraft(
  profile: ChatV2UserProfile | null,
  setProfile: (p: ChatV2UserProfile) => void,
) {
  const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
  const [bioDraft, setBioDraft] = useState('');
  const [isBioEditing, setIsBioEditing] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

  useEffect(() => {
    setBioDraft(profile?.user.bio || '');
    setIsBioEditing(false);
  }, [profile?.user.id]);

  const handleBioChange = (value: string) => {
    setBioDraft(value.slice(0, MAX_BIO_LENGTH));
  };

  const cancelBioEdit = () => {
    setIsBioEditing(false);
    setBioDraft(profile?.user.bio || '');
  };

  const handleSaveBio = async () => {
    if (!profile?.isSelf || isSavingBio) return;

    setIsSavingBio(true);
    try {
      const updated = await chatV2Service.updateOwnUserProfile({
        bio: bioDraft,
      });
      setProfile(updated);
      setBioDraft(updated.user.bio || '');
      setIsBioEditing(false);
      toast('Profile updated', { description: 'Your bio was saved.' });
    } catch (err) {
      toast('Failed to update bio', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSavingBio(false);
    }
  };

  return {
    bioDraft,
    isBioEditing,
    isSavingBio,
    setIsBioEditing,
    handleBioChange,
    cancelBioEdit,
    handleSaveBio,
  };
}
