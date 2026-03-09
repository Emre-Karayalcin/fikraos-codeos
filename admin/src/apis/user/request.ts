import { RoleEnum, type User } from '../auth';
import { supabaseAdmin } from '@/libs/supabase';
import type {
  CreateUserPayload,
  GetUsersParams,
  GetUsersResponse,
  UpdateUserPayload,
} from './types';

export const getUsers = async (
  params: GetUsersParams
): Promise<GetUsersResponse> => {
  try {
    console.log('📋 Fetching users from Supabase (admin.listUsers)...');

    const page = params.page || 1;
    const perPage = params.limit || 10;

    // Use admin client to list users (dev only). This returns a page of users but
    // the admin API doesn't reliably expose a full total count. We'll return a
    // best-effort `count`:
    // - If the returned page has fewer items than `perPage`, we can compute the
    //   exact total as (page-1)*perPage + users.length.
    // - If it equals `perPage`, we set `count` to null to indicate unknown.
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const mappedUsers: User[] = (users || []).map((supabaseUser) => ({
      id: supabaseUser.id,
      first_name: supabaseUser.user_metadata?.first_name || '',
      last_name: supabaseUser.user_metadata?.last_name || '',
      email: supabaseUser.email || '',
      role: supabaseUser.user_metadata?.role || supabaseUser.app_metadata?.role || RoleEnum.USER,
      phone: supabaseUser.user_metadata?.phone || '',
      tel: supabaseUser.user_metadata?.phone || '',
    }));

    // Apply client-side search filtering if provided (admin API doesn't support search)
    const filtered = params.search
      ? mappedUsers.filter(user =>
          user.email?.toLowerCase().includes(params.search?.toLowerCase() || '') ||
          user.first_name?.toLowerCase().includes(params.search?.toLowerCase() || '') ||
          user.last_name?.toLowerCase().includes(params.search?.toLowerCase() || '')
        )
      : mappedUsers;

    let count: number | null = null;
    if ((users || []).length < perPage) {
      count = (page - 1) * perPage + (users || []).length;
    }

    return {
      rows: filtered,
      count,
    };
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

export const createUser = async (data: CreateUserPayload): Promise<User> => {
  try {
    console.log('📝 Creating new user:', data.username);
    
    // Use admin API to create user with email auto-confirmation
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.username,
      password: data.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || '',
        role: data.role || RoleEnum.USER,
      },
    });

    if (error) {
      throw error;
    }

    if (!authData.user) {
      throw new Error('No user returned from signUp');
    }

    return {
      id: authData.user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.username,
      role: data.role as RoleEnum || RoleEnum.USER,
      phone: data.phone || '',
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async ({
  id,
  password,
  first_name,
  last_name,
  username,
  phone,
  role,
}: Partial<UpdateUserPayload>): Promise<User> => {
  try {
    console.log('✏️ Updating user:', id);
    
    // Build update data
    const updateData: {
      email?: string;
      password?: string;
      user_metadata?: {
        first_name?: string;
        last_name?: string;
        phone?: string;
        role?: string;
      };
    } = {};

    // Only add email if username is provided
    if (username) {
      updateData.email = username;
    }

    // Only add password if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    // Add user metadata
    if (first_name || last_name || phone || role) {
      updateData.user_metadata = {};
      if (first_name) updateData.user_metadata.first_name = first_name;
      if (last_name) updateData.user_metadata.last_name = last_name;
      if (phone) updateData.user_metadata.phone = phone;
      if (role) updateData.user_metadata.role = role;
    }

    // Use admin API to update user
    if (!id) {
      throw new Error('User ID is required for update');
    }

    const { data: { user: updatedUser }, error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      updateData
    );

    if (error) {
      throw error;
    }

    if (!updatedUser) {
      throw new Error('No user returned from update');
    }

    return {
      id: updatedUser.id,
      first_name: updatedUser.user_metadata?.first_name || '',
      last_name: updatedUser.user_metadata?.last_name || '',
      email: updatedUser.email || '',
      role: updatedUser.user_metadata?.role || updatedUser.app_metadata?.role || RoleEnum.USER,
      phone: updatedUser.user_metadata?.phone || '',
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUsers = async (ids: string[]): Promise<void> => {
  try {
    // Delete users one by one using admin API
    const deletePromises = ids.map(async (id) => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) {
        throw error;
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting users:', error);
    throw error;
  }
};

export const getUser = async (id: string): Promise<User> => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      email: user.email || '',
      role: user.user_metadata?.role || user.app_metadata?.role || RoleEnum.USER,
      phone: user.user_metadata?.phone || '',
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};
