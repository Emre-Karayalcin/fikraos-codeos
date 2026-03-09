import type { User } from '@/apis/auth';
import { useCreateUser, useUpdateUser } from '@/apis/user';
import type { CreateUserPayload, UpdateUserPayload } from '@/apis/user/types';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import React, { useState } from 'react';
import { AccountModal } from './components/AccountModal';
import { UsersTable } from './components/UsersTable';
import { getErrorMessage } from '@/libs/utils';

export const DEFAULT_COMMISSION_RATE = 10;

export const Accounts: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<Partial<User> | undefined>(
    undefined
  );

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(undefined);
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setModalMode('edit');
    // Map email to username for the form
    setSelectedUser({
      ...user,
      username: user.email,
    } as any);
    setModalVisible(true);
  };

  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser({
    onSuccess: () => {
      messageApi.success('Utilisateur créé avec succès');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_USERS] });
    },
    onError: error => {
      const errorMessage = getErrorMessage(error, `Error creating user`);
      messageApi.error(errorMessage);
    },
  });

  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser({
    onSuccess: () => {
      messageApi.success('Utilisateur mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_USERS] });
    },
    onError: error => {
      const errorMessage = getErrorMessage(error, `Error updating user`);
      messageApi.error(errorMessage);
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleSaveUser = async (
    values: Partial<User & { password?: string; username?: string }>
  ) => {
    try {
      if (modalMode === 'create') {
        // Create user with Supabase
        await createUser({
          username: values.username!,
          password: values.password!,
          first_name: values.first_name!,
          last_name: values.last_name!,
          phone: values.phone,
          role: values.role,
        } as CreateUserPayload);
      } else {
        // Update user with Supabase admin API
        const updatePayload: Partial<UpdateUserPayload> = {
          id: selectedUser?.id!,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          role: values.role,
        };

        // Only include password if it was provided
        if (values.password && values.password.trim() !== '') {
          updatePayload.password = values.password;
        }

        // Only include username/email if it changed
        if (values.username && values.username !== selectedUser?.email) {
          updatePayload.username = values.username;
        }

        await updateUser(updatePayload);
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="space-y-4">
        <UsersTable
          onCreateUser={handleCreateUser}
          onEditUser={handleEditUser}
        />
        {modalVisible && (
          <AccountModal
            visible={modalVisible}
            mode={modalMode}
            initialValues={selectedUser}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveUser}
            isLoading={isLoading}
          />
        )}
      </div>
    </>
  );
};
