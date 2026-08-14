import React from 'react';
import { AddExpenseView, AddExpenseViewProps } from './AddExpenseView';

export interface AddExpenseModalProps extends Omit<AddExpenseViewProps, 'onClose'> {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <AddExpenseView {...props} />;
};

export default AddExpenseModal;
