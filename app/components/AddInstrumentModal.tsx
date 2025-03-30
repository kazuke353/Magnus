import { useState, useEffect, lazy, Suspense } from 'react';
import { useFetcher } from '@remix-run/react';
import Button from './Button';
import Input from './Input';
import { InstrumentSearchResult, InstrumentMetadata } from '~/utils/portfolio/types';
import { FiSearch, FiPlus, FiX } from 'react-icons/fi';
import LoadingIndicator from './LoadingIndicator';

// Lazily import the Modal component
const Modal = lazy(() => import('./Modal').then(module => ({ default: module.Modal })));

interface AddInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist?: (instrument: InstrumentMetadata, notes?: string, targetPrice?: number) => void;
  onAddToPie?: (instrument: InstrumentMetadata, allocation?: number) => void;
  defaultMode?: 'watchlist' | 'pie';
}

export default function AddInstrumentModal({
  isOpen,
  onClose,
  onAddToWatchlist,
  onAddToPie,
  defaultMode = 'watchlist'
}: AddInstrumentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentMetadata | null>(null);
  const [notes, setNotes] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [allocation, setAllocation] = useState('');
  const [mode, setMode] = useState<'watchlist' | 'pie'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchFetcher = useFetcher();
  const instrumentFetcher = useFetcher();
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedInstrument(null);
      setNotes('');
      setTargetPrice('');
      setAllocation('');
      setError(null);
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);
  
  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      searchFetcher.load(`/api/portfolio/instruments/search?query=${encodeURIComponent(query)}`);
    } else {
      setSearchResults([]);
    }
  };
  
  // Update search results when fetcher completes
  useEffect(() => {
    if (searchFetcher.data && searchFetcher.state === 'idle') {
      setSearchResults(searchFetcher.data.results || []);
    }
  }, [searchFetcher.data, searchFetcher.state]);
  
  // Handle selecting an instrument from search results
  const handleSelectInstrument = (result: InstrumentSearchResult) => {
    setIsLoading(true);
    instrumentFetcher.load(`/api/portfolio/instruments/${result.symbol}`);
  };
  
  // Update selected instrument when fetcher completes
  useEffect(() => {
    if (instrumentFetcher.data && instrumentFetcher.state === 'idle') {
      if (instrumentFetcher.data.instrument) {
        setSelectedInstrument(instrumentFetcher.data.instrument);
      } else if (instrumentFetcher.data.error) {
        setError(instrumentFetcher.data.error);
      }
      setIsLoading(false);
    }
  }, [instrumentFetcher.data, instrumentFetcher.state]);
  
  // Handle adding instrument to watchlist
  const handleAddToWatchlist = () => {
    if (!selectedInstrument) {
      setError('Please select an instrument first');
      return;
    }
    
    const parsedTargetPrice = targetPrice ? parseFloat(targetPrice) : undefined;
    
    if (targetPrice && isNaN(parsedTargetPrice!)) {
      setError('Please enter a valid target price');
      return;
    }
    
    if (onAddToWatchlist) {
      onAddToWatchlist(selectedInstrument, notes || undefined, parsedTargetPrice);
      onClose();
    }
  };
  
  // Handle adding instrument to pie
  const handleAddToPie = () => {
    if (!selectedInstrument) {
      setError('Please select an instrument first');
      return;
    }
    
    const parsedAllocation = allocation ? parseFloat(allocation) : undefined;
    
    if (allocation && (isNaN(parsedAllocation!) || parsedAllocation! <= 0 || parsedAllocation! > 100)) {
      setError('Please enter a valid allocation percentage (1-100)');
      return;
    }
    
    if (onAddToPie) {
      onAddToPie(selectedInstrument, parsedAllocation);
      onClose();
    }
  };
  
  return (
    <Suspense fallback={<LoadingIndicator message="Loading Modal..." />}>
      {/* Conditionally render Modal only when isOpen is true */}
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Add Instrument"
        >
          <div className="space-y-6">
            {/* Mode selector */}
            {onAddToWatchlist && onAddToPie && (
              <div className="flex border rounded-md overflow-hidden">
                <button
                  className={`flex-1 py-2 ${mode === 'watchlist' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  onClick={() => setMode('watchlist')}
                >
                  Watchlist
                </button>
                <button
                  className={`flex-1 py-2 ${mode === 'pie' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  onClick={() => setMode('pie')}
                >
                  Pie
                </button>
              </div>
            )}
            
            {/* Search input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Instruments
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Enter ticker symbol or company name"
                  className="w-full pl-10"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Search results */}
            {searchResults.length > 0 && !selectedInstrument && (
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0"
                      onClick={() => handleSelectInstrument(result)}
                    >
                      <div className="font-medium">{result.symbol}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{result.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{result.exchange} • {result.type}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Selected instrument */}
            {selectedInstrument && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{selectedInstrument.ticker}</div>
                    <div className="text-sm">{selectedInstrument.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedInstrument.exchange} • {selectedInstrument.type}
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onClick={() => setSelectedInstrument(null)}
                  >
                    <FiX />
                  </button>
                </div>
                
                {selectedInstrument.currentPrice && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Current Price:</span> {selectedInstrument.currentPrice} {selectedInstrument.currencyCode}
                  </div>
                )}
              </div>
            )}
            
            {/* Watchlist specific fields */}
            {mode === 'watchlist' && selectedInstrument && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this instrument"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Price (Optional)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Set a target price for alerts"
                      className="w-full pl-8"
                      min="0"
                      step="0.01"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">{selectedInstrument.currencyCode}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Pie specific fields */}
            {mode === 'pie' && selectedInstrument && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Allocation (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={allocation}
                    onChange={(e) => setAllocation(e.target.value)}
                    placeholder="Enter target allocation percentage"
                    className="w-full pr-8"
                    min="0.1"
                    max="100"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {mode === 'watchlist' && onAddToWatchlist && (
                <Button
                  onClick={handleAddToWatchlist}
                  disabled={!selectedInstrument || isLoading}
                >
                  <FiPlus className="mr-1" />
                  Add to Watchlist
                </Button>
              )}
              
              {mode === 'pie' && onAddToPie && (
                <Button
                  onClick={handleAddToPie}
                  disabled={!selectedInstrument || isLoading}
                >
                  <FiPlus className="mr-1" />
                  Add to Pie
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Suspense>
  );
}
