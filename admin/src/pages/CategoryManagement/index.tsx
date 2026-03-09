import type { Category } from '@/apis/category/types';
import { useCreateCategory, useUpdateCategory } from '@/apis/category/mutation';
import type { CreateCategoryPayload, UpdateCategoryPayload } from '@/apis/category/types';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import React, { useState } from 'react';
import { CategoryModal } from './components/CategoryModal';
import { CategoriesTable } from './components/CategoriesTable';
import { getErrorMessage } from '@/libs/utils';

export const DEFAULT_COMMISSION_RATE = 10;

export const CategoryManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Partial<Category> | undefined>(
    undefined
  );

  const handleCreateCategory = () => {
    setModalMode('create');
    setSelectedCategory(undefined);
    setModalVisible(true);
  };

  const handleEditCategory = (cat: Category) => {
    setModalMode('edit');
    setSelectedCategory(cat as any);
    setModalVisible(true);
  };

  const { mutateAsync: createCategory, isPending: isCreating } = useCreateCategory({
    onSuccess: () => {
      messageApi.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_CATEGORIES] });
    },
    onError: error => {
      const errorMessage = getErrorMessage(error, `Error creating category`);
      messageApi.error(errorMessage);
    },
  });

  const { mutateAsync: updateCategory, isPending: isUpdating } = useUpdateCategory({
    onSuccess: () => {
      messageApi.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_CATEGORIES] });
    },
    onError: error => {
      const errorMessage = getErrorMessage(error, `Error updating category`);
      messageApi.error(errorMessage);
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleSaveCategory = async (
    values: Partial<Category & { order?: number }>
  ) => {
    try {
      if (modalMode === 'create') {
        await createCategory({
          name_en: values.name_en!,
          name_fr: values.name_fr!,
          order: values.order ?? 0,
          description_en: values.description_en,
          description_fr: values.description_fr,
        } as CreateCategoryPayload);
      } else {
        const id = selectedCategory?.id;
        if (!id) {
          messageApi.error('Missing category id');
          return;
        }

        const updatePayload: UpdateCategoryPayload = {
          id,
          name_en: values.name_en ?? '',
          name_fr: values.name_fr ?? '',
          order: values.order,
          description_en: values.description_en,
          description_fr: values.description_fr,
        };

        await updateCategory(updatePayload);
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving category:', error);
      const errMsg = (error as any)?.message || String(error);
      messageApi.error(getErrorMessage(error, `Error saving category: ${errMsg}`));
    }
  };

  return (
    <>
      {contextHolder}
      <div className="space-y-4">
        <CategoriesTable
          onCreateCategory={handleCreateCategory}
          onEditCategory={handleEditCategory}
        />
        {modalVisible && (
          <CategoryModal
            visible={modalVisible}
            mode={modalMode}
            initialValues={selectedCategory}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveCategory}
            isLoading={isLoading}
          />
        )}
      </div>
    </>
  );
};
