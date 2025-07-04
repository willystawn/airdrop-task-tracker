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
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className={`bg-base-200/80 backdrop-blur-md border border-base-300/50 rounded-xl shadow-2xl w-full ${sizeClasses[size]} m-4 animate-slide-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
            <button onClick={onClose} className="text-base-content-secondary hover:text-accent p-1 rounded-full hover:bg-base-300">
                <XMarkIcon className="w-6 h-6" />
            </button>
            </div>
            <div>{children}</div>
        </div>
      </div>
    </div>
  );
};
