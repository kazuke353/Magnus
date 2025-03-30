import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { PieData } from '~/utils/portfolio/types';

interface PieAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pie: PieData | null;
  onSave?: (pieName: string, targetAllocation: number) => void;
}

export default function PieAllocationModal({
  isOpen,
  onClose,
  pie,
  onSave
}: PieAllocationModalProps) {
  const [targetAllocation, setTargetAllocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const allocationFetcher = useFetcher();
  
  // Reset state when modal opens/closes or pie changes
  useEffect(() => {
    if (isOpen && pie) {
      setTargetAllocation(pie.targetAllocation?.toString() || '');
      setError(null);
    }
  }, [isOpen, pie]);
  
  // Handle input change
  const handleAllocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetAllocation(e.target.value);
    setError(null);
  };
  
  // Handle save
  const handleSave = () => {
    if (!pie) {
      setError('No pie selected');
      return;
    }
    
    const parsedAllocation = parseFloat(targetAllocation);
    
    if (isNaN(parsedAllocation)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (parsedAllocation <= 0 || parsedAllocation > 100) {
      setError('Allocation must be between 0 and 100');
      return;
    }
    
    setIsLoading(true);
    
    // Use the provided onSave callback or the fetcher
    if (onSave) {
      onSave(pie.name, parsedAllocation);
      onClose();
    } else {
      allocationFetcher.submit(
        {
          pieName: pie.name,
          targetAllocation: parsedAllocation
        },
        {
          method: 'post',
          action: '/api/portfolio/pies/allocation',
          encType: 'application/json'
        }
      );
    }
  };
  
  // Update state when fetcher completes
  useEffect(() => {
    if (allocationFetcher.data && allocationFetcher.state === 'idle') {
      setIsLoading(false);
      if (allocationFetcher.data.error) {
        setError(allocationFetcher.data.error);
      } else {
        onClose();
      }
    }
  }, [allocationFetcher.data, allocationFetcher.state, onClose]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Target Allocation"
    >
      <div className="space-y-6">
        {pie && (
          <>
            <div>
              <h3 className="text-lg font-medium">{pie.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set the target allocation percentage for this pie
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Allocation (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={targetAllocation}
                  onChange={handleAllocationChange}
                  placeholder="Enter target allocation percentage"
                  className="w-full pr-8"
                  min="0.1"
                  max="100"
                  step="0.1"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              
              {error && (
                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                Save
              </Button>
            </div>
          </>
        )}
        
        {!pie && (
          <div className="text-center py-4">
            No pie selected
          </div>
        )}
      </div>
    </Modal>
  );
}
