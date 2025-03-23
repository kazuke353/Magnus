import { useState, useEffect } from 'react';
import { FiTarget, FiCalendar, FiDollarSign, FiPercent } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import { formatCurrency } from '~/utils/formatters';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  expectedReturn: number;
  currency: string;
  createdAt: string;
}

interface GoalFormProps {
  goal?: Goal;
  onSave: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  currentPortfolioValue: number;
  currency: string;
}

export default function GoalForm({
  goal,
  onSave,
  onCancel,
  currentPortfolioValue,
  currency
}: GoalFormProps) {
  // Default date is 5 years from now
  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() + 5);
  const defaultDateString = defaultDate.toISOString().split('T')[0];

  // Initialize form state
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    targetAmount: goal?.targetAmount || 0,
    currentAmount: goal?.currentAmount || currentPortfolioValue,
    targetDate: goal?.targetDate || defaultDateString,
    monthlyContribution: goal?.monthlyContribution || 1000,
    expectedReturn: goal?.expectedReturn || 6,
  });

  // Update current amount when portfolio value changes
  useEffect(() => {
    if (!goal) {
      setFormData(prev => ({
        ...prev,
        currentAmount: currentPortfolioValue
      }));
    }
  }, [currentPortfolioValue, goal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (['targetAmount', 'currentAmount', 'monthlyContribution', 'expectedReturn'].includes(name)) {
      const numValue = parseFloat(value);
      setFormData({
        ...formData,
        [name]: isNaN(numValue) ? 0 : numValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      alert('Please enter a goal name');
      return;
    }
    
    if (formData.targetAmount <= 0) {
      alert('Target amount must be greater than zero');
      return;
    }
    
    if (new Date(formData.targetDate) <= new Date()) {
      alert('Target date must be in the future');
      return;
    }
    
    // Save the goal
    onSave({
      ...formData,
      currency
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Goal Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiTarget className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., House Down Payment, Retirement Fund"
            value={formData.name}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Amount ({currency})
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="targetAmount"
              name="targetAmount"
              type="number"
              min="0"
              step="1000"
              placeholder="50000"
              value={formData.targetAmount}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Amount ({currency})
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="currentAmount"
              name="currentAmount"
              type="number"
              min="0"
              step="100"
              placeholder={currentPortfolioValue.toString()}
              value={formData.currentAmount}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Default is your current portfolio value: {formatCurrency(currentPortfolioValue, currency)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="targetDate"
              name="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="monthlyContribution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monthly Contribution ({currency})
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="monthlyContribution"
              name="monthlyContribution"
              type="number"
              min="0"
              step="100"
              placeholder="1000"
              value={formData.monthlyContribution}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="expectedReturn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expected Annual Return (%)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiPercent className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            id="expectedReturn"
            name="expectedReturn"
            type="number"
            min="0"
            max="30"
            step="0.5"
            placeholder="6"
            value={formData.expectedReturn}
            onChange={handleChange}
            className="pl-10"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Historical average stock market return is around 7-10% before inflation
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}
