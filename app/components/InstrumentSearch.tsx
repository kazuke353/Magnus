import { useState, useEffect, useRef } from 'react';
import { useFetcher } from '@remix-run/react';
import { InstrumentSearchResult } from '~/utils/portfolio/types';
import Input from './Input';
import { FiSearch, FiPlus, FiX } from 'react-icons/fi';

interface InstrumentSearchProps {
  onSelect: (result: InstrumentSearchResult) => void;
  onAddToWatchlist?: (result: InstrumentSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function InstrumentSearch({
  onSelect,
  onAddToWatchlist,
  placeholder = 'Search for instruments...',
  className = ''
}: InstrumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const searchFetcher = useFetcher();
  
  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      searchFetcher.load(`/api/portfolio/instruments/search?query=${encodeURIComponent(query)}`);
      setIsDropdownOpen(true);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  };
  
  // Update search results when fetcher completes
  useEffect(() => {
    if (searchFetcher.data && searchFetcher.state === 'idle') {
      setSearchResults(searchFetcher.data.results || []);
      setIsDropdownOpen(searchFetcher.data.results?.length > 0);
    }
  }, [searchFetcher.data, searchFetcher.state]);
  
  // Handle selecting an instrument from search results
  const handleSelectResult = (result: InstrumentSearchResult) => {
    onSelect(result);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };
  
  // Handle adding an instrument to watchlist
  const handleAddToWatchlist = (result: InstrumentSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToWatchlist) {
      onAddToWatchlist(result);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="w-full pl-10"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FiSearch className="text-gray-400" />
        </div>
        {searchQuery && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setSearchQuery('');
              setIsDropdownOpen(false);
            }}
          >
            <FiX />
          </button>
        )}
      </div>
      
      {isDropdownOpen && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
        >
          {searchResults.map((result) => (
            <div
              key={result.symbol}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
              onClick={() => handleSelectResult(result)}
            >
              <div>
                <div className="font-medium">{result.symbol}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{result.name}</div>
                <div className="text-xs text-gray-500">{result.exchange} • {result.type}</div>
              </div>
              
              {onAddToWatchlist && (
                <button
                  className="p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={(e) => handleAddToWatchlist(result, e)}
                >
                  <FiPlus size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
