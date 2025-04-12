import { useState } from 'react';
import { WatchlistItem } from '~/utils/portfolio/types';
import SortableTable from './SortableTable';
import Button from './Button';
import Input from './Input';
import { FiEdit2, FiTrash2, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import { formatCurrency, formatPercentage } from '~/utils/formatters'; // Import formatters

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
        updates.alertEnabled = true; // Enable alert when target price is set
      }
    } else {
      updates.targetPrice = undefined;
      updates.alertEnabled = false; // Disable alert if target price is removed
    }

    onUpdate(ticker, updates);
    setEditingTicker(null);
  };

  // Toggle alert status
  const handleToggleAlert = (ticker: string, currentStatus: boolean) => {
    onUpdate(ticker, { alertEnabled: !currentStatus });
  };

  // Define table columns
  const columns = [
    {
      key: 'ticker', // Use key instead of accessor
      header: 'Symbol',
      sortable: true,
      filterable: true,
      render: (item: WatchlistItem) => ( // Use render instead of cell
        <div>
          <div className="font-medium">{item.ticker}</div>
          <div className="text-xs text-gray-500">{item.exchange}</div>
        </div>
      )
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      render: (item: WatchlistItem) => (
        <div>
          <div className="truncate max-w-xs">{item.name}</div>
          <div className="text-xs text-gray-500">{item.sector || '-'}</div>
        </div>
      )
    },
    {
      key: 'currentPrice',
      header: 'Price',
      sortable: true,
      render: (item: WatchlistItem) => formatCurrency(item.currentPrice, currency)
    },
    {
      key: 'targetPrice',
      header: 'Target',
      sortable: true,
      render: (item: WatchlistItem) => {
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
        return formatCurrency(item.targetPrice, currency);
      }
    },
    {
      key: 'alertEnabled',
      header: 'Alert',
      sortable: true,
      render: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return null; // Don't show toggle button while editing
        }
        return (
          <button
            onClick={() => handleToggleAlert(item.ticker, !!item.alertEnabled)}
            className={`p-1 rounded-full ${item.alertEnabled ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
            title={item.alertEnabled ? "Disable Alert" : "Enable Alert"}
          >
            <FiAlertCircle size={18} />
          </button>
        );
      }
    },
    {
      key: 'notes',
      header: 'Notes',
      sortable: false, // Notes usually aren't sortable
      filterable: true,
      render: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return (
            <Input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full"
              placeholder="Add notes..."
            />
          );
        }
        return <span className="text-sm text-gray-600 dark:text-gray-400">{item.notes || '-'}</span>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      render: (item: WatchlistItem) => {
        if (editingTicker === item.ticker) {
          return (
            <div className="flex space-x-1">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSaveEdit(item.ticker)}
                title="Save changes"
              >
                <FiCheck size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                title="Cancel edit"
              >
                <FiX size={16} />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartEdit(item)}
              title="Edit item"
            >
              <FiEdit2 size={16} />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRemove(item.ticker)}
              title="Remove item"
            >
              <FiTrash2 size={16} />
            </Button>
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
      itemsPerPage={10} // Adjust as needed
      keyField="ticker" // Specify the unique key field for rows
      className="w-full"
      emptyMessage="No instruments match your search."
    />
  );
}
