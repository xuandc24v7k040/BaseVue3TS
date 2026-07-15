import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { listVietnamProvinces, listVietnamWards } from '../api/province-api'

const ADMINISTRATIVE_CACHE_MS = 24 * 60 * 60 * 1_000

export const vietnamAdministrativeKeys = {
  all: ['vietnam-administrative-units-v2'] as const,
  provinces: () => [...vietnamAdministrativeKeys.all, 'provinces'] as const,
  wards: (provinceCode: number) => [...vietnamAdministrativeKeys.all, 'wards', provinceCode] as const,
}

export function useVietnamProvinces() {
  return useQuery({
    queryKey: vietnamAdministrativeKeys.provinces(),
    queryFn: ({ signal }) => listVietnamProvinces(signal),
    staleTime: ADMINISTRATIVE_CACHE_MS,
    gcTime: ADMINISTRATIVE_CACHE_MS,
    retry: 1,
  })
}

export function useVietnamWards(provinceCode: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => vietnamAdministrativeKeys.wards(toValue(provinceCode) ?? 0)),
    queryFn: ({ signal }) => listVietnamWards(toValue(provinceCode) as number, signal),
    enabled: computed(() => toValue(provinceCode) !== null),
    staleTime: ADMINISTRATIVE_CACHE_MS,
    gcTime: ADMINISTRATIVE_CACHE_MS,
    retry: 1,
  })
}
