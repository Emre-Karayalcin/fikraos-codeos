import React, { useEffect } from 'react';
import { Button, Form, Input, Modal, InputNumber } from 'antd';
import type { Category } from '@/apis/category/types';

interface CategoryModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<Category>;
  onClose: () => void;
  onSave: (data: Partial<Category & { order?: number }>) => void;
  isLoading: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  mode,
  initialValues,
  onClose,
  onSave,
  isLoading,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues || {});
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  return (
    <Modal open={visible} onCancel={onClose} footer={null} width={600}>
      <h3 className="mb-6 border-b border-[#FEFEFE33] pb-4 text-2xl font-medium text-white">
        {mode === 'create' ? 'Create category' : 'Edit category'}
      </h3>

      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit}>
        <Form.Item name="name_en" label="Name (EN)" rules={[{ required: true }]}> 
          <Input placeholder="Name in English" />
        </Form.Item>

        <Form.Item name="name_fr" label="Name (FR)" rules={[{ required: true }]}> 
          <Input placeholder="Name in French" />
        </Form.Item>

        <Form.Item name="order" label="Order">
          <InputNumber className="!w-full" placeholder="Sort order" />
        </Form.Item>

        <Form.Item name="description_en" label="Description (EN)">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item name="description_fr" label="Description (FR)">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item className="!mt-6 text-center">
          <Button
            loading={isLoading}
            type="primary"
            htmlType="submit"
            className="!rounded-[8px] !bg-[#B8D8C0] !border-none !text-[#0D1F2D] !px-6 !py-2"
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
