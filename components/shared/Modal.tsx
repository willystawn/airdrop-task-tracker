
import React, { ReactNode } from 'react';
import { XMarkIcon } from './icons/HeroIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`bg-base-100 rounded-lg shadow-xl w-full ${sizeClasses[size]} p-6 m-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="text-base-content hover:text-accent">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
    