import React from 'react';
import { Button, Form, Input, message } from 'antd';
import { useLogin } from '@/apis/auth/mutation';
import { RoleEnum, type LoginPayload } from '@/apis/auth/types';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/libs/utils';

export const Login: React.FC = () => {
  const { refetch } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const loginMutation = useLogin({
    onSuccess: async () => {
      // Wait a bit for Supabase to persist the session to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now fetch the user to verify role
      const res = await refetch();
      const user = res.data;
      
      console.log('👤 User role:', user?.role);
      console.log('🎯 Required role:', RoleEnum.ADMIN);
      
      if (user && user.role === RoleEnum.ADMIN) {
        // User is authenticated and is admin - navigation will happen automatically
        messageApi.success('Login successful!');
      } else {
        // TEMPORARY: Allow login even without admin role for testing
        console.warn('⚠️ User is not admin, but allowing for development');
        messageApi.success('Login successful! (Dev mode - role check bypassed)');
        
        // TODO: Uncomment this after setting admin role in Supabase
        // const { supabase } = await import('@/libs/supabase');
        // await supabase.auth.signOut();
        // messageApi.error('You are not authorized to access this application');
      }
    },
    onError: error => {
      const errorMessage = getErrorMessage(error, 'Login failed');
      messageApi.error(errorMessage.replace(/_/g, ' '));
    },
  });

  const onFinish = (values: LoginPayload) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1F2D] p-4">
      {contextHolder}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <div className="-ml-5 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-28" />
          </div>
        </div>

        {/* Login Form */}
        <div className="rounded-lg p-8 shadow-xl">
          <Form
            name="login"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Username is required' }]}
            >
              <Input
                placeholder="Enter username"
                className="h-[50px] !border-none !bg-[#FFFFFF1A] !px-5"
              />
            </Form.Item>

            <Form.Item
              className="!mt-8 [&_.ant-input]:!bg-[#FFFFFF1A]"
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Password is required',
                },
              ]}
            >
              <Input.Password
                placeholder="********"
                className="h-[50px] !border-none !px-5"
              />
            </Form.Item>

            <Form.Item className="!mt-12">
              <Button
                type="primary"
                htmlType="submit"
                loading={loginMutation.isPending}
                className="!h-12 w-full !bg-[#B8D8C0] !font-medium !text-black hover:brightness-95"
              >
                Login
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};
