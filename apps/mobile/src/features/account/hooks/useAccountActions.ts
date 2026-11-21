import { useMutation } from '@tanstack/react-query';
import { Share } from 'react-native';
import { useApi } from '../../../shared/api/api-context';
import { endSession } from '../../../shared/session/session-store';

export const useExportData = () => {
  const api = useApi();
  return useMutation({ mutationFn: () => api.me.export() });
};

export const useDeleteAccount = () => {
  const api = useApi();
  return useMutation({
    mutationFn: () => api.me.delete(),
    onSuccess: endSession,
  });
};

export const useSignOut = () => useMutation({ mutationFn: endSession });

export const useShareExport = () => useMutation({ mutationFn: (message: string) => Share.share({ message }) });
