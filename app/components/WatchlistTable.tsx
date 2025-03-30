import { useState } from 'react';
import { WatchlistItem } from '~/utils/portfolio/types';
import SortableTable from './SortableTable';
import Button from './Button';
import Input from './Input';
import { FiEdit2, FiTrash2, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';

interface WatchlistTableProps {
  watchlist: WatchlistItem[];
  onRemove: (ticker: string) => void;
  onUpdate: (ticker: string, updates: Partial<WatchlistItem>) => void;
  currency?: string;
}

export default function WatchlistTable({
  watchlist,
  onRemove,
  onUpdate,
  currency = 'USD'
}: WatchlistTableProps) {
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTargetPrice, setEditTargetPrice] = useState('');
  
  // Start editing a watchlist item
  const handleStartEdit = (item: WatchlistItem) => {
    setEditingTicker(item.ticker);
    setEditNotes(item.notes || '');
    setEditTargetPrice(item.targetPrice?.toString() || '');
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTicker(null);
  };
  
  // Save edited watchlist item
  const handleSaveEdit = (ticker: string) => {
    const updates: Partial<WatchlistItem> = {
      notes: editNotes || undefined
    };
    
    if (editTargetPrice) {
      const parsedPrice = parseFloat(editTargetPrice);
      if (!isNaN(parsedPrice)) {
        updates.targetPrice = parsedPrice;
        updates.alertEnabled = true;
      }
    } else {
      updates.targetPrice = undefined;
      updates.alertEnabled = false;
    }
    
    onUpdate(ticker, updates);
    setEditingTicker(null);
  };
  
  // Toggle alert status
  const handleToggleAlert = (ticker: string, currentStatus: boolean) => {
    onUpdate(ticker, { alertEnabled: !currentStatus });
  };
  
  // Format price with currency
  const formatPrice = (price?: number) => {
    if (price === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };
  
  // Format percentage
  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Define table columns
  const columns = [
    {
      header: 'Symbol',
      accessor: 'ticker',
      cell: (item: WatchlistItem) => (
        <div>
          <div className="font-medium">{item.ticker}</div>
          <div className="text-xs text-gray-500">{item.exchange}</div>
        </div>
      )
    },
    {
      header: 'Name',
      accessor: 'name',
      cell: (item: WatchlistItem) => (
        <div>
          <div className="truncate max-w-xs">{item.name}</div>
          <div className="text-xs text-gray-500">{item.sector || '-'}</div>
        </div>
      )
    },
    {
      header: 'Price',
      accessor: 'currentPrice',
      cell: (item: WatchlistItem) => formatPrice(item.currentPrice)
    },
    {
      header: 'Target',
      accessor: 'targetPrice',
      cell: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return (
            <Input
              type="number"
              value={editTargetPrice}
              onChange={(e) => setEditTargetPrice(e.target.value)}
              className="w-24"
              min="0"
              step="0.01"
            />
          );
        }
        return formatPrice(item.targetPrice);
      }
    },
    {
      header: 'Alert',
      accessor: 'alertEnabled',
      cell: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return null;
        }
        return (
          <button
            onClick={() => handleToggleAlert(item.ticker, !!item.alertEnabled)}
            className={`p-1 rounded-full ${item.alertEnabled ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <FiAlertCircle size={18} />
          </button>
        );
      }
    },
    {
      header: 'Notes',
      accessor: 'notes',
      cell: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return (
            <Input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full"
            />
          );
        }
        return item.notes || '-';
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return (
            <div className="flex space-x-1">
              <button
                onClick={() => handleSaveEdit(item.ticker)}
                className="p-1 text-green-500 hover:text-green-700"
              >
                <FiCheck size={18} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <FiX size={18} />
              </button>
            </div>
          );
        }
        return (
          <div className="flex space-x-1">
            <button
              onClick={() => handleStartEdit(item)}
              className="p-1 text-blue-500 hover:text-blue-700"
            >
              <FiEdit2 size={16} />
            </button>
            <button
              onClick={() => onRemove(item.ticker)}
              className="p-1 text-red-500 hover:text-red-700"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        );
      }
    }
  ];
  
  if (watchlist.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Your watchlist is empty. Add instruments to track them.
      </div>
    );
  }
  
  return (
    <SortableTable
      data={watchlist}
      columns={columns}
      defaultSortBy="name"
      keyField="ticker"
      className="w-full"
    />
  );
}
