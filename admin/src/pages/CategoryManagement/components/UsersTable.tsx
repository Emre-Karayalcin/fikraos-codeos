import type { User } from '@/apis/auth';
import { useDeleteUsers } from '@/apis/user';
import { useGetUsers } from '@/apis/user/queries';
import type { GetUsersParams } from '@/apis/user/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LookupIcon } from '@/icons/lookup';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { DeleteFilled, EditFilled } from '@ant-design/icons';
import { Button, Card, message, Table, Popconfirm, Input, Tooltip, Tag } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { RoleEnum } from '@/apis/auth/types';
import type { TableRowSelection } from 'antd/es/table/interface';
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/libs/utils';

interface UsersTableProps {
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  onCreateUser,
  onEditUser,
}) => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const [params, setParams] = useState<GetUsersParams>({
    page: 1,
    limit: 10,
  });
  // keep params.search in sync with debounced input
  React.useEffect(() => {
    setParams(prev => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  const { data, isLoading: isUsersLoading } = useGetUsers({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  // If the current page is out of range after a delete/refetch, move to the last page
  React.useEffect(() => {
    if (!data) return;
    // only auto-adjust when we have a numeric total (nullable count means unknown)
    if (typeof data.count !== 'number') return;
    const total = data.count;
    const lastPage = Math.max(1, Math.ceil(total / params.limit));
    if (params.page > lastPage) {
      setParams(prev => ({ ...prev, page: lastPage }));
    }
  }, [data, params.limit, params.page]);

  const [localRows, setLocalRows] = useState<User[]>([]);
  React.useEffect(() => {
    setLocalRows(data?.rows || []);
    // eslint-disable-next-line no-console
    console.debug('Category UsersTable params:', params, 'rows length:', data?.rows?.length ?? 0, 'count:', data?.count);
  }, [data, params.page, params.limit, params.search]);

  // When server count is unknown (null), give a small allowance of extra pages
  // so the pagination control exposes next pages initially. Cap the estimate
  // to avoid wildly large numbers in the UI.
  const UNKNOWN_PAGE_ALLOWANCE = 2; // allow up to 2 more pages when unknown
  const MAX_PAGES = 10; // hard cap (avoid showing too many pages)
  const estimated = (params.page - 1) * params.limit + localRows.length + (localRows.length === params.limit ? params.limit * UNKNOWN_PAGE_ALLOWANCE : 0);
  const cap = params.limit * MAX_PAGES;
  const total = typeof data?.count === 'number' ? data.count : Math.min(estimated, cap);

  const { mutateAsync: deleteUsers, isPending: isDeletingUsers } =
    useDeleteUsers({
      onSuccess: () => {
        messageApi.success('Accounts deleted successfully');
        queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_USERS] });
        setSelectedRowKeys([]);
        setOpen(false);
      },
      onError: error => {
        messageApi.error(getErrorMessage(error, 'An error occurred'));
      },
    });

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys as string[]);
  };

  const handleDeleteSelectedUsers = async () => {
    await deleteUsers(selectedRowKeys);
  };

  const rowSelection: TableRowSelection<User> = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (record: User) => ({
      name: record.id,
    }),
  };

  const columns: ColumnType<User>[] = [
    {
      title: (
        <div className="flex items-center gap-1">
          <LookupIcon />
          <span>Username</span>
        </div>
      ),
      dataIndex: 'username',
      key: 'username',
      render: (_: string, record: User) => (
        <div className="flex items-center space-x-3">
          <div>
            <p className="text-sm font-medium text-white">
              {record.first_name
                ? `${record.first_name} ${record.last_name}`
                : '_'}
            </p>
            <p className="text-[13px] font-medium text-[#C8C8C8]">
              {record.email || '_'}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'First name',
      dataIndex: 'first_name',
      key: 'first_name',
      render: (value: string) => (
        <span className="text-white">{value || '_'}</span>
      ),
    },
    {
      title: 'Last name',
      dataIndex: 'last_name',
      key: 'last_name',
      render: (value: string) => (
        <span className="text-white">{value || '_'}</span>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'tel',
      key: 'tel',
      render: (value: string) => (
        <span className="text-white">{value || '_'}</span>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (value: RoleEnum) => (
        <Tag color={value === RoleEnum.ADMIN ? 'gold' : 'blue'}>
          {value === RoleEnum.ADMIN ? 'Admin' : 'User'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 350,
      align: 'end',
      render: (_, record: User) => (
        <div className="flex justify-end space-x-2">
          <Tooltip title="Edit user">
            <button
              className="cursor-pointer p-0.5 text-slate-400 hover:text-white"
              onClick={() => onEditUser(record)}
            >
              <EditFilled className="[&_svg]:size-4" />
            </button>
          </Tooltip>

          <Tooltip title="Delete user">
            <Popconfirm
              title="Delete user"
              description={`Are you sure you want to delete the account of ${record.email}?`}
              onConfirm={() => deleteUsers([record.id])}
            >
              <button className="cursor-pointer p-0.5 text-slate-400 hover:text-white">
                <DeleteFilled className="[&_svg]:size-4" />
              </button>
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <Card className="[&_.ant-card-body]:!p-0">
      {contextHolder}
      <div className="flex items-center justify-between p-[19px]">
        <h3 className="font-bold text-white">All Users</h3>

        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Button
              onClick={() => setOpen(true)}
              className="h-[30px] !rounded-[25px] !border-none !bg-red-500 px-3 !py-2 !text-xs !font-medium !text-white !shadow-none"
            >
              Deleted {selectedRowKeys.length}{' '}
              {selectedRowKeys.length > 1 ? 'users' : 'user'} selected
            </Button>
          )}

          <div className="flex items-center gap-4">
            <Input
              placeholder="Search user"
              className="!min-w-[300px]"
              onChange={e => {
                setSearch(e.target.value);
                setParams(prev => ({ ...prev, page: 1 }));
              }}
            />
            <Button
              onClick={onCreateUser}
              className="h-[30px] !rounded-[25px] !border-none !bg-[#B8D8C0] px-3 !py-2 !text-xs !font-medium !shadow-none hover:!text-[#0D1F2D]"
            >
              Create new user
            </Button>
          </div>
        </div>
      </div>

      <Table
        loading={isUsersLoading}
        rowSelection={rowSelection}
        columns={columns}
        dataSource={localRows}
        rowKey="id"
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total,
          showSizeChanger: false,
          onChange: (page, pageSize) => setParams(prev => ({ ...prev, page, limit: pageSize || prev.limit })),
        }}
      />
      <ConfirmModal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleDeleteSelectedUsers}
        title={`Delete selected users`}
        content={`Are you sure you want to delete the selected users?`}
        isLoading={isDeletingUsers}
      />
    </Card>
  );
};
