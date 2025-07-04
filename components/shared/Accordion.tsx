import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './icons/HeroIcons';

interface AccordionProps {
  titleContent: ReactNode;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ titleContent, children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-start text-left focus:outline-none group/accordion"
      >
        <div className="flex-grow">{titleContent}</div>
        <div className="pl-2 pt-1">
            {isOpen 
                ? <ChevronUpIcon className="w-5 h-5 text-base-content-secondary group-hover/accordion:text-primary transition-colors" /> 
                : <ChevronDownIcon className="w-5 h-5 text-base-content-secondary group-hover/accordion:text-primary transition-colors" />
            }
        </div>
      </button>
      {isOpen && (
        <div className="pr-2 mt-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};
