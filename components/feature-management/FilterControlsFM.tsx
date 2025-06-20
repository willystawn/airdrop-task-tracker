
import React from 'react';
import { TaskFilters, TaskSortOption, TaskResetCategory, GlobalTag } from '../../types';
import { Tag } from '../shared/Tag'; // Use Tag component for consistent display

interface FilterControlsFMProps {
  filters: TaskFilters;
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  sortOption: TaskSortOption;
  onSortChange: (sortOption: TaskSortOption) => void;
  onClearFilters: () => void;
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
  globalTagDefinitions: GlobalTag[];
}

export const FilterControlsFM: React.FC<FilterControlsFMProps> = ({
  filters,
  onFilterChange,
  sortOption,
  onSortChange,
  onClearFilters,
  showCompleted,
  onShowCompletedChange,
  globalTagDefinitions
}) => {
  const handleTagToggle = (tagText: string) => {
    const newTags = filters.tags.includes(tagText)
      ? filters.tags.filter(t => t !== tagText)
      : [...filters.tags, tagText];
    onFilterChange('tags', newTags);
  };

  return (
    <div className="p-4 bg-base-200/80 rounded-lg shadow mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Search Text */}
        <div>
          <label htmlFor="searchText" className="block text-sm font-medium text-base-content-secondary mb-1">Search Tasks</label>
          <input
            type="text"
            id="searchText"
            placeholder="Search by title or description..."
            value={filters.searchText}
            onChange={(e) => onFilterChange('searchText', e.target.value)}
            className="w-full bg-base-100 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="categoryFilter" className="block text-sm font-medium text-base-content-secondary mb-1">Filter by Category</label>
          <select
            id="categoryFilter"
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value as TaskResetCategory | "")}
            className="w-full bg-base-100 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none"
          >
            <option value="">All Categories</option>
            {Object.values(TaskResetCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label htmlFor="sortOption" className="block text-sm font-medium text-base-content-secondary mb-1">Sort by</label>
          <select
            id="sortOption"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as TaskSortOption)}
            className="w-full bg-base-100 border border-base-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm appearance-none"
          >
            {Object.values(TaskSortOption).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Tag Filter */}
      <div>
        <label className="block text-sm font-medium text-base-content-secondary mb-1">Filter by Tags</label>
        <div className="flex flex-wrap gap-2">
          {globalTagDefinitions.map(tagDef => (
            <Tag
              key={tagDef.text}
              text={tagDef.text}
              colorClasses={filters.tags.includes(tagDef.text) 
                            ? `${tagDef.colorClasses} ring-2 ring-offset-1 ring-offset-base-200 ring-current` // Highlight active
                            : `${tagDef.colorClasses} opacity-70 hover:opacity-100`}
              onClick={() => handleTagToggle(tagDef.text)}
              className="transition-all"
            />
          ))}
           {globalTagDefinitions.length === 0 && <p className="text-xs text-base-content-secondary">No system tags defined for filtering.</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
         <button
            onClick={onClearFilters}
            className="px-4 py-2 border border-base-300 rounded-md text-sm font-medium text-base-content-secondary hover:bg-base-300/70 focus:outline-none"
          >
            Clear All Filters
          </button>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => onShowCompletedChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary rounded border-base-300 focus:ring-primary"
            />
            <span className="text-sm text-base-content-secondary">Show Completed Tasks</span>
          </label>
      </div>
    </div>
  );
};
