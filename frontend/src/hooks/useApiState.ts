import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useApiState<T>(key: string, url: string, fallback: T) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get<{ data: T }>(url)).data.data, placeholderData: keepPreviousData, retry: false, initialData: fallback })
}
