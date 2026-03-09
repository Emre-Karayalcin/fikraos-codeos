import { supabase, supabaseAdmin } from '@/libs/supabase';
import type {
  Specialty,
  CreateSpecialtyPayload,
  GetSpecialtiesParams,
  GetSpecialtiesResponse,
  UpdateSpecialtyPayload,
} from './types';

export const getSpecialties = async (
  params: GetSpecialtiesParams
): Promise<GetSpecialtiesResponse> => {
  try {
    const from = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const to = params.limit && from !== undefined ? from + params.limit - 1 : undefined;

    // Call select with count:'exact' up-front so PostgREST returns total count
    let query = supabase.from('specialties').select('*', { count: 'exact' });
    if (params.search) {
      const s = params.search.toLowerCase();
      query = query.or(`name_en.ilike.%${s}%,name_fr.ilike.%${s}%`);
    }
    if (from !== undefined && to !== undefined) {
      query = query.range(from, to);
    }

    // apply ordering and execute; `count` will be returned because select was
    // called with { count: 'exact' } earlier
    const { data, error, count } = await query.order('order', { ascending: true });
    if (error) throw error;
    return {
      rows: (data || []) as Specialty[],
      count: typeof count === 'number' ? count : null,
    };
  } catch (error) {
    console.error('Error getting specialties:', error);
    throw error;
  }
};

export const createSpecialty = async (payload: CreateSpecialtyPayload): Promise<Specialty> => {
  try {
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('specialties').insert([payload]).select().maybeSingle();
    if (error) {
      console.error('Supabase insert error (specialties):', error);
      throw error;
    }
    if (!data) throw new Error('No specialty was created (possible RLS or validation issue)');
    return data as Specialty;
  } catch (error) {
    console.error('Error creating specialty:', error);
    throw error;
  }
};

export const updateSpecialty = async (payload: UpdateSpecialtyPayload): Promise<Specialty> => {
  try {
    const { id, ...rest } = payload;
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('specialties').update(rest).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Specialty not found');
    return data as Specialty;
  } catch (error) {
    console.error('Error updating specialty:', error);
    throw error;
  }
};

export const deleteSpecialties = async (ids: string[]): Promise<void> => {
  try {
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('specialties').delete().in('id', ids).select('id');
    if (error) {
      console.error('Supabase delete error (specialties):', error);
      throw error;
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('No specialties were deleted (possible RLS or missing ids)');
    }
  } catch (error) {
    console.error('Error deleting specialties:', error);
    throw error;
  }
};

export const getSpecialty = async (id: string): Promise<Specialty | null> => {
  try {
    const { data, error } = await supabase.from('specialties').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Specialty) || null;
  } catch (error) {
    console.error('Error getting specialty:', error);
    throw error;
  }
};
