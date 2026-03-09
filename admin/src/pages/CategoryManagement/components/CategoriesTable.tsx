import React, { useState } from 'react';
import type { Category } from '@/apis/category/types';
import { useDeleteCategories } from '@/apis/category/mutation';
import { useGetCategories } from '@/apis/category/queries';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DeleteFilled, EditFilled } from '@ant-design/icons';
import { Button, Card, message, Table, Popconfirm, Input, Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/libs/utils';

interface Props {
  onCreateCategory: () => void;
  onEditCategory: (cat: Category) => void;
}

export const CategoriesTable: React.FC<Props> = ({ onCreateCategory, onEditCategory }) => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const [params, setParams] = useState({ page: 1, limit: 10, search: '' });

  // keep params.search in sync with debounced search input
  React.useEffect(() => {
    setParams(prev => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  const { data, isLoading } = useGetCategories(params);

  // Ensure we don't stay on an out-of-range page after deletes
  React.useEffect(() => {
    if (!data) return;
    const total = data.count ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / params.limit));
    if (params.page > lastPage) {
      setParams(prev => ({ ...prev, page: lastPage }));
    }
  }, [data, params.limit, params.page]);

  const { mutateAsync: deleteCategories, isPending: isDeleting } = useDeleteCategories({
    onSuccess: () => {
      messageApi.success('Categories deleted successfully');
      queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_CATEGORIES] });
      setSelectedRowKeys([]);
      setOpen(false);
    },
    onError: error => {
      messageApi.error(getErrorMessage(error, 'An error occurred'));
    },
  });

  const onSelectChange = (newKeys: React.Key[]) => setSelectedRowKeys(newKeys as string[]);

  const handleDeleteSelected = async () => {
    await deleteCategories(selectedRowKeys);
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await deleteCategories([id]);
    } catch (err) {
      messageApi.error(getErrorMessage(err, 'An error occurred while deleting'));
    }
  };

  const rowSelection: TableRowSelection<Category> = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: record => ({ name: record.id }),
  };

  const columns: ColumnType<Category>[] = [
    { title: 'Name (EN)', dataIndex: 'name_en', key: 'name_en', render: (v: string) => <span className="text-white">{v || '_'}</span> },
    { title: 'Name (FR)', dataIndex: 'name_fr', key: 'name_fr', render: (v: string) => <span className="text-white">{v || '_'}</span> },
    { title: 'Order', dataIndex: 'order', key: 'order', render: (v: number) => <span className="text-white">{v ?? '_'}</span> },
    { title: 'Description (EN)', dataIndex: 'description_en', key: 'description_en', render: (v: string) => <span className="text-white">{v || '_'}</span> },
    { title: 'Description (FR)', dataIndex: 'description_fr', key: 'description_fr', render: (v: string) => <span className="text-white">{v || '_'}</span> },
    {
      title: '', key: 'actions', align: 'end', render: (_, record: Category) => (
        <div className="flex justify-end space-x-2">
          <Tooltip title="Edit category">
            <button className="cursor-pointer p-0.5 text-slate-400 hover:text-white" onClick={() => onEditCategory(record)}>
              <EditFilled className="[&_svg]:size-4" />
            </button>
          </Tooltip>
          <Tooltip title="Delete category">
            <Popconfirm title="Delete category" description={`Delete ${record.name_en}?`} onConfirm={() => handleDeleteOne(record.id)}>
              <button className="cursor-pointer p-0.5 text-slate-400 hover:text-white"><DeleteFilled className="[&_svg]:size-4" /></button>
            </Popconfirm>
          </Tooltip>
        </div>
      )
    }
  ];

  const rows = data?.rows || [];
  const total = data?.count || 0;

  return (
    <Card className="[&_.ant-card-body]:!p-0">
      {contextHolder}
      <div className="flex items-center justify-between p-[19px]">
        <h3 className="font-bold text-white">Categories</h3>
        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Button onClick={() => setOpen(true)} className="h-[30px] !rounded-[25px] !border-none !bg-red-500 px-3 !py-2 !text-xs !font-medium !text-white !shadow-none">
              Deleted {selectedRowKeys.length} {selectedRowKeys.length > 1 ? 'categories' : 'category'} selected
            </Button>
          )}
          <div className="flex items-center gap-4">
            <Input placeholder="Search category" className="!min-w-[300px]" onChange={e => { setSearch(e.target.value); setParams(prev => ({ ...prev, page: 1, search: e.target.value })); }} />
            <Button onClick={onCreateCategory} className="h-[30px] !rounded-[25px] !border-none !bg-[#B8D8C0] px-3 !py-2 !text-xs !font-medium !shadow-none hover:!text-[#0D1F2D]">Create new category</Button>
          </div>
        </div>
      </div>

      <Table
        loading={isLoading}
        rowSelection={rowSelection}
        columns={columns}
        dataSource={rows}
        rowKey="id"
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total,
          showSizeChanger: false,
          onChange: (page, pageSize) => setParams(prev => ({ ...prev, page, limit: pageSize || prev.limit })),
        }}
      />

      <ConfirmModal open={open} onCancel={() => setOpen(false)} onOk={handleDeleteSelected} title={`Delete selected categories`} content={`Are you sure you want to delete selected categories?`} isLoading={isDeleting} />
    </Card>
  );
};
