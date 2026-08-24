import type { LocationRepository } from '@/services/contracts';

import { supabaseClient } from './supabaseClient';

export const supabaseLocationRepository: LocationRepository = {
  async listCities() {
    const { data, error } = await supabaseClient
      .from('cities')
      .select('id, name')
      .order('name');

    if (error) throw error;

    return data.map((city) => ({ id: city.id, name: city.name }));
  },

  async listDistricts(cityId) {
    const { data, error } = await supabaseClient
      .from('districts')
      .select('id, city_id, name')
      .eq('city_id', cityId)
      .order('name');

    if (error) throw error;

    return data.map((district) => ({
      id: district.id,
      cityId: district.city_id ?? '',
      name: district.name,
    }));
  },

  async listBranches(districtId) {
    let query = supabaseClient
      .from('branches')
      .select('id, district_id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (districtId) {
      query = query.eq('district_id', districtId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((branch) => ({
      id: branch.id,
      districtId: branch.district_id ?? '',
      name: branch.name,
      isActive: branch.is_active ?? true,
    }));
  },

  async getBranch(branchId) {
    const { data, error } = await supabaseClient
      .from('branches')
      .select('id, district_id, name, is_active, districts (city_id)')
      .eq('id', branchId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      districtId: data.district_id ?? '',
      name: data.name,
      isActive: data.is_active ?? true,
      cityId:
        (data as { districts: { city_id: string } | null }).districts
          ?.city_id ?? null,
    };
  },
};
