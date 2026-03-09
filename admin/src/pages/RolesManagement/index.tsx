import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { RolesTable } from './components/RolesTable';
import { RoleModal } from './components/RoleModal';
import { useCreateRole, useUpdateRole } from '@/apis/roles/mutation';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { getErrorMessage } from '@/libs/utils';
import type { Role } from '@/apis/roles/types';

export const RolesManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRole, setSelectedRole] = useState<Partial<Role> | undefined>(undefined);

  const { mutateAsync: createRole, isPending: isCreating } = useCreateRole({
    onSuccess: () => {
      messageApi.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_ROLES] });
    },
    onError: error => {
      messageApi.error(getErrorMessage(error, 'Error creating role'));
    },
  });

  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole({
    onSuccess: () => {
      messageApi.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_ROLES] });
    },
    onError: error => {
      messageApi.error(getErrorMessage(error, 'Error updating role'));
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleCreateRole = () => {
    setModalMode('create');
    setSelectedRole(undefined);
    setModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setModalMode('edit');
    setSelectedRole(role);
    setModalVisible(true);
  };

  const handleSaveRole = async (values: Partial<Role & { order?: number }>) => {
    try {
      if (modalMode === 'create') {
        await createRole({
          name_en: values.name_en!,
          name_fr: values.name_fr!,
          order: values.order ?? 0,
          color: values.color,
        });
      } else {
        const id = selectedRole?.id;
        if (!id) {
          messageApi.error('Missing role id');
          return;
        }

        await updateRole({ id, name_en: values.name_en ?? '', name_fr: values.name_fr ?? '', order: values.order, color: values.color });
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving role:', error);
      messageApi.error(getErrorMessage(error, 'Error saving role'));
    }
  };

  return (
    <>
      {contextHolder}
      <div className="space-y-4">
        <RolesTable onCreateRole={handleCreateRole} onEditRole={handleEditRole} />
        {modalVisible && (
          <RoleModal visible={modalVisible} mode={modalMode} initialValues={selectedRole} onClose={() => setModalVisible(false)} onSave={handleSaveRole} isLoading={isLoading} />
        )}
      </div>
    </>
  );
};

export default RolesManagement;
