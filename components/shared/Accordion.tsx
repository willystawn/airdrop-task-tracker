
import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './icons/HeroIcons'; // Assuming you'll create these

interface AccordionProps {
  titleContent: ReactNode;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ titleContent, children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="border border-neutral/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-neutral/20 hover:bg-neutral/30 focus:outline-none transition-colors"
      >
        <div className="text-left">{titleContent}</div>
        {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-base-100 border-t border-neutral/50 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};
    