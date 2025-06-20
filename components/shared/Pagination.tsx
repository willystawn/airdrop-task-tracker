
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/HeroIcons';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    return null; // Don't render pagination if only one page or no items
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Max direct page links (e.g., 1 ... 4 5 6 ... 10)
    const halfMax = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) { // Show all if few pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1); // Always show first page

      let startPage = Math.max(2, currentPage - halfMax + (currentPage > totalPages - halfMax -1 ? (maxPagesToShow - (totalPages - currentPage) -1 ) : 0 )  );
      let endPage = Math.min(totalPages - 1, currentPage + halfMax - (currentPage < halfMax +2 ? (maxPagesToShow - currentPage ) : 0 ) );
      
      if (currentPage - 1 > halfMax && totalPages > maxPagesToShow) {
         if (startPage > 2) pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
          pageNumbers.push(i);
        }
      }
      
      if (totalPages - currentPage > halfMax && totalPages > maxPagesToShow) {
        if (endPage < totalPages -1 ) pageNumbers.push('...');
      }
      pageNumbers.push(totalPages); // Always show last page
    }
    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-between border-t border-base-300 px-4 py-3 sm:px-6 mt-8" aria-label="Pagination">
      <div className="hidden sm:block">
        <p className="text-sm text-base-content-secondary">
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md bg-base-200 px-3 py-2 text-sm font-semibold text-base-content ring-1 ring-inset ring-base-300 hover:bg-base-300 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" aria-hidden="true" />
          Previous
        </button>
        <div className="hidden sm:flex ml-3 space-x-1">
            {pageNumbers.map((page, index) => 
                typeof page === 'number' ? (
                    <button
                        key={`page-${page}`}
                        onClick={() => onPageChange(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                            ${currentPage === page 
                                ? 'z-10 bg-primary text-white' 
                                : 'text-base-content bg-base-200 ring-1 ring-inset ring-base-300 hover:bg-base-300'
                            }`}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-base-content-secondary ring-1 ring-inset ring-base-300">
                        ...
                    </span>
                )
            )}
        </div>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md bg-base-200 px-3 py-2 text-sm font-semibold text-base-content ring-1 ring-inset ring-base-300 hover:bg-base-300 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRightIcon className="h-5 w-5 ml-1" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
