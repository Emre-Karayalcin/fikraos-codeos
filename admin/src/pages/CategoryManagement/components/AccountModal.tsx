import type { User } from '@/apis/auth';
import { RoleEnum } from '@/apis/auth/types';
import { Button, Form, Input, Modal, Select } from 'antd';
import React, { useEffect } from 'react';

const { Option } = Select;

interface AccountModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<User>;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  isLoading: boolean;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  visible,
  mode,
  initialValues,
  onClose,
  onSave,
  isLoading,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      // form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal open={visible} onCancel={onClose} footer={null} width={500}>
      <h3 className="mb-6 border-b border-[#FEFEFE33] pb-4 text-2xl font-medium text-white">
        {mode === 'create' ? 'Create a new user' : 'Edit user'}
      </h3>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ ...initialValues }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="first_name"
          label="First name"
          rules={[{ required: true, message: 'Please enter first name' }]}
        >
          <Input placeholder="First name" />
        </Form.Item>

        <Form.Item
          name="last_name"
          label="Last name"
          rules={[{ required: true, message: 'Please enter last name' }]}
        >
          <Input placeholder="Last name" />
        </Form.Item>

        <Form.Item
          name="username"
          label={mode === 'create' ? 'Email' : 'Email'}
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input 
            placeholder="email@example.com" 
            disabled={mode === 'edit'}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: mode === 'create', message: 'Please enter password' },
            { 
              min: 6, 
              message: 'Password must be at least 6 characters' 
            },
          ]}
        >
          <Input.Password 
            placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'password'} 
          />
        </Form.Item>

        <Form.Item
          label="Phone number"
          name="phone"
        >
          <Input placeholder="+1234567890" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: 'Please select role' }]}
          initialValue={RoleEnum.USER}
        >
          <Select placeholder="Select role">
            <Option value={RoleEnum.ADMIN}>Admin</Option>
            <Option value={RoleEnum.USER}>User</Option>
          </Select>
        </Form.Item>
        <Form.Item className="!mt-10 !mb-0 text-center">
          <Button
            type="primary"
            htmlType="submit"
            className="mx-auto w-[273px] !rounded-[25px] !border-none !bg-[#B8D8C0] px-6 !py-2 !text-xs !font-medium !text-[#0D1F2D] !shadow-none hover:!text-[#0D1F2D]"
            loading={isLoading}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
