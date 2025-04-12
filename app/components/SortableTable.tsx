    import { useState, useMemo, useEffect, ReactNode } from 'react'; // Added ReactNode
    import { FiChevronUp, FiChevronDown, FiSearch, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

    interface Column<T> {
      key: keyof T | string;
      header: string;
      render?: (item: T) => React.ReactNode;
      sortable?: boolean;
      sortFn?: (a: T, b: T) => number;
      filterable?: boolean;
    }

    interface SortableTableProps<T> {
      data: T[];
      columns: Column<T>[];
      itemsPerPage?: number;
      className?: string;
      emptyMessage?: string;
      keyField: keyof T;
      onRowClick?: (item: T) => void; // Add optional row click handler
    }

    export default function SortableTable<T>({
      data,
      columns,
      itemsPerPage = 10,
      className = '',
      emptyMessage = 'No data available',
      keyField,
      onRowClick // Destructure the new prop
    }: SortableTableProps<T>) {
      const [sortConfig, setSortConfig] = useState<{
        key: keyof T | string;
        direction: 'asc' | 'desc';
      } | null>(null);

      const [currentPage, setCurrentPage] = useState(1);
      const [filterText, setFilterText] = useState('');
      const [filterColumn, setFilterColumn] = useState<keyof T | string | null>(null);

      const filterableColumns = useMemo(() => {
        return columns.filter(column => column.filterable !== false);
      }, [columns]);

      const handleSort = (key: keyof T | string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
        }
        setSortConfig({ key, direction });
      };

      const sortedAndFilteredData = useMemo(() => {
        let filteredData = [...data];

        if (filterText && filterColumn) {
          filteredData = filteredData.filter(item => {
            const value = item[filterColumn as keyof T];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(filterText.toLowerCase());
          });
        } else if (filterText) {
          filteredData = filteredData.filter(item => {
            return filterableColumns.some(column => {
              const value = item[column.key as keyof T];
              if (value === null || value === undefined) return false;
              return String(value).toLowerCase().includes(filterText.toLowerCase());
            });
          });
        }

        if (sortConfig) {
          const { key, direction } = sortConfig;
          const column = columns.find(col => col.key === key);

          filteredData.sort((a, b) => {
            if (column?.sortFn) {
              return direction === 'asc' ? column.sortFn(a, b) : column.sortFn(b, a);
            }
            const aValue = a[key as keyof T];
            const bValue = b[key as keyof T];
            if (aValue === bValue) return 0;
            if (typeof aValue === 'number' && typeof bValue === 'number') {
              return direction === 'asc' ? aValue - bValue : bValue - aValue;
            }
            if (aValue instanceof Date && bValue instanceof Date) {
              return direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }
            const aString = String(aValue ?? '').toLowerCase();
            const bString = String(bValue ?? '').toLowerCase();
            return direction === 'asc' ? aString.localeCompare(bString) : bString.localeCompare(aString);
          });
        }
        return filteredData;
      }, [data, sortConfig, filterText, filterColumn, filterableColumns, columns]);

      const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
      const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedAndFilteredData.slice(startIndex, startIndex + itemsPerPage);
      }, [sortedAndFilteredData, currentPage, itemsPerPage]);

      useEffect(() => {
        setCurrentPage(1);
      }, [filterText, filterColumn]);

      return (
        <div className="space-y-4">
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            {filterableColumns.length > 0 && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiFilter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filterColumn as string || ''}
                  onChange={(e) => setFilterColumn(e.target.value || null)}
                >
                  <option value="">All Columns</option>
                  {filterableColumns.map((column) => (
                    <option key={column.key as string} value={column.key as string}>
                      {column.header}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
              <thead className="bg-gray-100 dark:bg-gray-900">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key as string}
                      scope="col"
                      className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${column.sortable !== false ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800' : ''}`}
                      onClick={() => column.sortable !== false && handleSort(column.key)}
                    >
                      <div className="flex items-center">
                        <span>{column.header}</span>
                        {column.sortable !== false && sortConfig && sortConfig.key === column.key && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <tr
                      key={item[keyField] as React.Key}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick ? 'cursor-pointer' : ''}`} // Add cursor pointer if clickable
                      onClick={() => onRowClick && onRowClick(item)} // Call handler on row click
                    >
                      {columns.map((column) => (
                        <td key={column.key as string} className="px-4 py-3 whitespace-nowrap text-sm">
                          {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === 1 ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Previous</button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === totalPages ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Next</button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="font-medium">{sortedAndFilteredData.length}</span> results</p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${currentPage === 1 ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><span className="sr-only">First</span><span>First</span></button>
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${currentPage === 1 ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><span className="sr-only">Previous</span><FiChevronLeft className="h-5 w-5" /></button>
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) pageNumber = i + 1;
                      else if (currentPage <= 3) pageNumber = i + 1;
                      else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
                      else pageNumber = currentPage - 2 + i;
                      return (<button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${currentPage === pageNumber ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{pageNumber}</button>);
                    })}
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium ${currentPage === totalPages ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><span className="sr-only">Next</span><FiChevronRight className="h-5 w-5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${currentPage === totalPages ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><span className="sr-only">Last</span><span>Last</span></button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
