import { supabase, supabaseAdmin } from '@/libs/supabase';
import type {
  Role,
  CreateRolePayload,
  GetRolesParams,
  GetRolesResponse,
  UpdateRolePayload,
} from './types';

export const getRoles = async (params: GetRolesParams): Promise<GetRolesResponse> => {
  try {
    const from = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const to = params.limit && from !== undefined ? from + params.limit - 1 : undefined;

    // request exact count along with rows
    let query = supabase.from('roles').select('*', { count: 'exact' });
    if (params.search) {
      const s = params.search.toLowerCase();
      query = query.or(`name_en.ilike.%${s}%,name_fr.ilike.%${s}%`);
    }

    if (from !== undefined && to !== undefined) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('order', { ascending: true });
    if (error) throw error;
    return {
      rows: (data || []) as Role[],
      count: typeof count === 'number' ? count : null,
    };
  } catch (error) {
    console.error('Error getting roles:', error);
    throw error;
  }
};

export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  try {
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('roles').insert([payload]).select().maybeSingle();
    if (error) {
      console.error('Supabase insert error (roles):', error);
      throw error;
    }
    if (!data) throw new Error('No role was created (possible RLS or validation issue)');
    return data as Role;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

export const updateRole = async (payload: UpdateRolePayload): Promise<Role> => {
  try {
    const { id, ...rest } = payload;
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('roles').update(rest).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Role not found');
    return data as Role;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
};

export const deleteRoles = async (ids: string[]): Promise<void> => {
  try {
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data, error } = await writeClient.from('roles').delete().in('id', ids).select('id');
    if (error) {
      console.error('Supabase delete error (roles):', error);
      throw error;
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('No roles were deleted (possible RLS or missing ids)');
    }
  } catch (error) {
    console.error('Error deleting roles:', error);
    throw error;
  }
};

export const getRole = async (id: string): Promise<Role | null> => {
  try {
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Role) || null;
  } catch (error) {
    console.error('Error getting role:', error);
    throw error;
  }
};
