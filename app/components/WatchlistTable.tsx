import { useState } from 'react';
    import { WatchlistItem } from '~/utils/portfolio/types';
    import SortableTable from './SortableTable';
    import Button from './Button';
    import Input from './Input';
    import { FiEdit2, FiTrash2, FiAlertCircle, FiCheck, FiX, FiEye } from 'react-icons/fi'; // Added FiEye
    import { formatCurrency, formatPercentage } from '~/utils/formatters';

    interface WatchlistTableProps {
      watchlist: WatchlistItem[];
      onRemove: (ticker: string) => void;
      onUpdate: (ticker: string, updates: Partial<WatchlistItem>) => void;
      currency?: string;
      onSelectItem: (ticker: string) => void; // Add prop for selecting an item
    }

    export default function WatchlistTable({
      watchlist,
      onRemove,
      onUpdate,
      currency = 'USD',
      onSelectItem // Destructure the new prop
    }: WatchlistTableProps) {
      const [editingTicker, setEditingTicker] = useState<string | null>(null);
      const [editNotes, setEditNotes] = useState('');
      const [editTargetPrice, setEditTargetPrice] = useState('');

      const handleStartEdit = (item: WatchlistItem, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click when clicking edit
        setEditingTicker(item.ticker);
        setEditNotes(item.notes || '');
        setEditTargetPrice(item.targetPrice?.toString() || '');
      };

      const handleCancelEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click if called from button
        setEditingTicker(null);
      };

      const handleSaveEdit = (ticker: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click when clicking save
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

      const handleToggleAlert = (ticker: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        onUpdate(ticker, { alertEnabled: !currentStatus });
      };

      const handleRemoveClick = (ticker: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        onRemove(ticker);
      };

      const columns = [
        {
          key: 'ticker',
          header: 'Symbol',
          sortable: true,
          filterable: true,
          render: (item: WatchlistItem) => (
            <div onClick={() => onSelectItem(item.ticker)} className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
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
            <div onClick={() => onSelectItem(item.ticker)} className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
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
                  onClick={(e) => e.stopPropagation()} // Prevent row click
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
              return null;
            }
            return (
              <button
                onClick={(e) => handleToggleAlert(item.ticker, !!item.alertEnabled, e)}
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
          sortable: false,
          filterable: true,
          render: (item: WatchlistItem) => {
            if (editingTicker === item.ticker) {
              return (
                <Input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevent row click
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
                    onClick={(e) => handleSaveEdit(item.ticker, e)}
                    title="Save changes"
                  >
                    <FiCheck size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleCancelEdit(e)}
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
                  variant="ghost" // Use ghost for less emphasis
                  size="sm"
                  onClick={() => onSelectItem(item.ticker)} // Add view details button
                  title="View details"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FiEye size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleStartEdit(item, e)}
                  title="Edit item"
                >
                  <FiEdit2 size={16} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => handleRemoveClick(item.ticker, e)}
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
          itemsPerPage={10}
          keyField="ticker"
          className="w-full"
          emptyMessage="No instruments match your search."
          // Add row click handler
          onRowClick={(item) => onSelectItem(item.ticker)}
        />
      );
    }
