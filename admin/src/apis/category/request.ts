import { supabase, supabaseAdmin } from '@/libs/supabase';
import type {
  Category,
  CreateCategoryPayload,
  GetCategoriesParams,
  GetCategoriesResponse,
  UpdateCategoryPayload,
} from './types';

export const getCategories = async (
  params: GetCategoriesParams
): Promise<GetCategoriesResponse> => {
  try {
    const from = params.page && params.limit ? (params.page - 1) * params.limit : undefined;
    const to = params.limit && from !== undefined ? from + params.limit - 1 : undefined;

    // request count along with rows
    let query = supabase.from('categories').select('*', { count: 'exact' });
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
      rows: (data || []) as Category[],
      count: typeof count === 'number' ? count : null,
    };
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

export const createCategory = async (
  payload: CreateCategoryPayload
): Promise<Category> => {
  try {
    // Use admin client when available (VITE_SUPABASE_ROLE_KEY). This bypasses RLS
    // and is intended for development only. Do NOT expose a service role key
    // in production client-side builds. For production, perform these actions
    // on a trusted server or Edge Function.
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;

    const { data, error } = await writeClient
      .from('categories')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    if (!data) {
      // No rows returned — could be RLS blocking the insert or an empty result
      throw new Error('No category was created (possible RLS or validation issue)');
    }

    return data as Category;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateCategory = async (
  payload: UpdateCategoryPayload
): Promise<Category> => {
  try {
    const { id, ...rest } = payload;
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;

    const { data, error } = await writeClient
      .from('categories')
      .update(rest)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      // Avoid PGRST116 (Cannot coerce the result to a single JSON object)
      // by returning a friendly error when no row was found/updated.
      throw new Error('Category not found');
    }

    return data as Category;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategories = async (ids: string[]): Promise<void> => {
  try {
    const writeClient = import.meta.env.VITE_SUPABASE_ROLE_KEY ? supabaseAdmin : supabase;

    // Use .select() so Supabase returns the deleted rows — this lets us detect
    // when zero rows were deleted (common when RLS blocks the operation).
    const { data, error } = await writeClient.from('categories').delete().in('id', ids).select('id');

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('No categories were deleted (possible RLS or missing ids)');
    }
  } catch (error) {
    console.error('Error deleting categories:', error);
    throw error;
  }
};

export const getCategory = async (id: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Category) || null;
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
};
