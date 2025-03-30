import { useState } from 'react';
import { WatchlistItem, InstrumentSearchResult } from '~/utils/portfolio/types';
import WatchlistTable from './WatchlistTable';
import InstrumentSearch from './InstrumentSearch';
import AddInstrumentModal from './AddInstrumentModal';
import Button from './Button';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  onAddToWatchlist: (instrument: any, notes?: string, targetPrice?: number) => void;
  onRemoveFromWatchlist: (ticker: string) => void;
  onUpdateWatchlistItem: (ticker: string, updates: Partial<WatchlistItem>) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  currency?: string;
}

export default function WatchlistPanel({
  watchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onUpdateWatchlistItem,
  onRefresh,
  isLoading = false,
  currency = 'USD'
}: WatchlistPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle quick add from search
  const handleQuickAdd = (result: InstrumentSearchResult) => {
    onAddToWatchlist({
      ticker: result.symbol,
      name: result.name,
      exchange: result.exchange,
      type: result.type
    });
  };
  
  // Handle search result selection
  const handleSearchSelect = (result: InstrumentSearchResult) => {
    setIsAddModalOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="w-full md:w-2/3">
          <InstrumentSearch
            onSelect={handleSearchSelect}
            onAddToWatchlist={handleQuickAdd}
            placeholder="Search for instruments to add to watchlist..."
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isLoading}
          >
            <FiPlus className="mr-1" />
            Add Instrument
          </Button>
          
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <FiRefreshCw className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <WatchlistTable
        watchlist={watchlist}
        onRemove={onRemoveFromWatchlist}
        onUpdate={onUpdateWatchlistItem}
        currency={currency}
      />
      
      <AddInstrumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddToWatchlist={onAddToWatchlist}
        defaultMode="watchlist"
      />
    </div>
  );
}
