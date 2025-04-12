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
      onSelectItem: (ticker: string) => void; // Add prop for selecting an item
    }

    export default function WatchlistPanel({
      watchlist,
      onAddToWatchlist,
      onRemoveFromWatchlist,
      onUpdateWatchlistItem,
      onRefresh,
      isLoading = false,
      currency = 'USD',
      onSelectItem // Destructure the new prop
    }: WatchlistPanelProps) {
      const [isAddModalOpen, setIsAddModalOpen] = useState(false);
      const [searchTerm, setSearchTerm] = useState('');

      const handleQuickAdd = (result: InstrumentSearchResult) => {
        onAddToWatchlist({
          ticker: result.symbol,
          name: result.name,
          exchange: result.exchange,
          type: result.type
        });
      };

      const handleSearchSelect = (result: InstrumentSearchResult) => {
        // When selecting from search, directly open the detail view for the selected item
        // This assumes the item might already be in the watchlist or will be added.
        // A better UX might be to add it first, then select, but this simplifies for now.
        onSelectItem(result.symbol);
        // Alternatively, open the Add modal:
        // setIsAddModalOpen(true);
      };

      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="w-full md:w-2/3">
              <InstrumentSearch
                onSelect={handleSearchSelect} // Use the updated handler
                onAddToWatchlist={handleQuickAdd}
                placeholder="Search instruments or select from table..."
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading}
              >
                <FiPlus className="mr-1" />
                Add Manually
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
            onSelectItem={onSelectItem} // Pass the handler down
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
