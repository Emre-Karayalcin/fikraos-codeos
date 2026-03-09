import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { SpecialtiesTable } from './components/SpecialtiesTable';
import { SpecialtyModal } from './components/SpecialtyModal';
import { useCreateSpecialty, useUpdateSpecialty } from '@/apis/specialties/mutation';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { getErrorMessage } from '@/libs/utils';
import type { Specialty } from '@/apis/specialties/types';

export const SpecialtiesManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Partial<Specialty> | undefined>(undefined);

  const { mutateAsync: createSpecialty, isPending: isCreating } = useCreateSpecialty({
    onSuccess: () => {
      messageApi.success('Specialty created successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_SPECIALTIES] });
    },
    onError: error => {
      messageApi.error(getErrorMessage(error, 'Error creating specialty'));
    },
  });

  const { mutateAsync: updateSpecialty, isPending: isUpdating } = useUpdateSpecialty({
    onSuccess: () => {
      messageApi.success('Specialty updated successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_SPECIALTIES] });
    },
    onError: error => {
      messageApi.error(getErrorMessage(error, 'Error updating specialty'));
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleCreateSpecialty = () => {
    setModalMode('create');
    setSelectedSpecialty(undefined);
    setModalVisible(true);
  };

  const handleEditSpecialty = (role: Specialty) => {
    setModalMode('edit');
    setSelectedSpecialty(role);
    setModalVisible(true);
  };

  const handleSaveSpecialty = async (values: Partial<Specialty & { order?: number }>) => {
    try {
      if (modalMode === 'create') {
        await createSpecialty({
          name_en: values.name_en!,
          name_fr: values.name_fr!,
          order: values.order ?? 0,
        });
      } else {
        const id = selectedSpecialty?.id;
        if (!id) {
          messageApi.error('Missing specialty id');
          return;
        }

        await updateSpecialty({ id, name_en: values.name_en ?? '', name_fr: values.name_fr ?? '', order: values.order });
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving specialty:', error);
      messageApi.error(getErrorMessage(error, 'Error saving specialty'));
    }
  };

  return (
    <>
      {contextHolder}
      <div className="space-y-4">
        <SpecialtiesTable onCreateSpecialty={handleCreateSpecialty} onEditSpecialty={handleEditSpecialty} />
        {modalVisible && (
          <SpecialtyModal visible={modalVisible} mode={modalMode} initialValues={selectedSpecialty} onClose={() => setModalVisible(false)} onSave={handleSaveSpecialty} isLoading={isLoading} />
        )}
      </div>
    </>
  );
};

export default SpecialtiesManagement;
