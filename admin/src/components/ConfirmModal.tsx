import { Modal } from 'antd';

interface ConfirmModalProps {
  title: string;
  content: React.ReactNode;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onCancel,
  onOk,
  content,
  title,
  isLoading,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={isLoading}
    >
      <div className="mb-8 flex flex-col gap-4 text-white">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm">{content}</p>
      </div>
    </Modal>
  );
};
