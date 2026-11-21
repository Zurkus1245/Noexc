import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/api/api-context';
import { meQuery } from '../api/me';

export const useMe = (enabled: boolean) => {
  const api = useApi();
  return useQuery({ ...meQuery(api), enabled });
};
