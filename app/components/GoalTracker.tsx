import { useState, useEffect } from 'react';
import Card from './Card';
import { FiTarget, FiTrendingUp, FiAward, FiCalendar } from 'react-icons/fi';
import { formatCurrency } from '~/utils/formatters';
import Button from './Button';

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

interface GoalTrackerProps {
  goals: Goal[];
  currentPortfolioValue: number;
  currency: string;
  onAddGoal?: () => void;
  onEditGoal?: (goal: Goal) => void;
  className?: string;
}

export default function GoalTracker({
  goals,
  currentPortfolioValue,
  currency,
  onAddGoal,
  onEditGoal,
  className = ""
}: GoalTrackerProps) {
  const [showMilestoneAlert, setShowMilestoneAlert] = useState<{goalId: string, message: string} | null>(null);

  // Check for milestones when goals or portfolio value changes
  useEffect(() => {
    if (!goals.length) return;
    
    // Find a goal that has reached a milestone
    for (const goal of goals) {
      const percentComplete = (goal.currentAmount / goal.targetAmount) * 100;
      
      // Check for 25%, 50%, 75% milestones
      const milestones = [25, 50, 75];
      for (const milestone of milestones) {
        // If we're within 1% of a milestone, show an alert
        if (percentComplete >= milestone && percentComplete < milestone + 1) {
          setShowMilestoneAlert({
            goalId: goal.id,
            message: `Congratulations! You've reached ${milestone}% of your "${goal.name}" goal!`
          });
          return;
        }
      }
      
      // Check for round number milestones (e.g., 10,000, 25,000)
      const roundMilestones = [5000, 10000, 25000, 50000, 100000];
      for (const milestone of roundMilestones) {
        // If we've just crossed a milestone (within 5% over)
        if (goal.currentAmount >= milestone && goal.currentAmount < milestone * 1.05) {
          setShowMilestoneAlert({
            goalId: goal.id,
            message: `Amazing! You've invested ${formatCurrency(milestone, currency)} toward your "${goal.name}" goal!`
          });
          return;
        }
      }
    }
  }, [goals, currentPortfolioValue, currency]);

  // Calculate projected final amount based on monthly contribution and expected return
  const calculateProjection = (goal: Goal) => {
    const targetDate = new Date(goal.targetDate);
    const currentDate = new Date();
    
    // Calculate months remaining
    const monthsRemaining = 
      (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + 
      (targetDate.getMonth() - currentDate.getMonth());
    
    if (monthsRemaining <= 0) return goal.currentAmount;
    
    // Calculate future value with compound interest
    // FV = P(1+r)^n + PMT * ((1+r)^n - 1) / r
    const monthlyRate = goal.expectedReturn / 100 / 12;
    const currentPrincipal = goal.currentAmount;
    const monthlyContribution = goal.monthlyContribution;
    
    const principalComponent = currentPrincipal * Math.pow(1 + monthlyRate, monthsRemaining);
    const contributionComponent = monthlyContribution * (Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate;
    
    return principalComponent + contributionComponent;
  };

  // Calculate percentage complete
  const getPercentComplete = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Format the target date in a readable format
  const formatTargetDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Goals</h2>
        {onAddGoal && (
          <Button onClick={onAddGoal} size="sm">
            Add Goal
          </Button>
        )}
      </div>

      {/* Milestone Alert */}
      {showMilestoneAlert && (
        <div className="mb-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 border-l-4 border-yellow-400 p-4 rounded-md shadow-md animate-pulse">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAward className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {showMilestoneAlert.message}
              </p>
              <button 
                className="mt-2 text-xs text-yellow-600 dark:text-yellow-300 underline"
                onClick={() => setShowMilestoneAlert(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <Card className="text-center p-6">
          <FiTarget className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Financial Goals Set</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Setting financial goals helps you stay motivated and track your progress.
          </p>
          {onAddGoal && (
            <Button onClick={onAddGoal}>
              Set Your First Goal
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const percentComplete = getPercentComplete(goal.currentAmount, goal.targetAmount);
            const projectedAmount = calculateProjection(goal);
            const willReachGoal = projectedAmount >= goal.targetAmount;
            
            return (
              <Card key={goal.id} className="p-5">
                <div className="space-y-4">
                  {/* Goal Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800 mr-3">
                        <FiTarget className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <FiCalendar className="mr-1 h-4 w-4" />
                          <span>Target: {formatTargetDate(goal.targetDate)}</span>
                        </div>
                      </div>
                    </div>
                    {onEditGoal && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEditGoal(goal)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Current: {formatCurrency(goal.currentAmount, currency)}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Target: {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${
                          percentComplete >= 100 
                            ? 'bg-green-500 dark:bg-green-600' 
                            : 'bg-blue-500 dark:bg-blue-600'
                        }`}
                        style={{ width: `${percentComplete}%` }}
                      ></div>
                    </div>
                    <p className="text-right text-sm mt-1 font-medium text-gray-600 dark:text-gray-400">
                      {percentComplete}% complete
                    </p>
                  </div>
                  
                  {/* Projection */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <div className="flex items-start">
                      <FiTrendingUp className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          At {formatCurrency(goal.monthlyContribution, currency)}/month and {goal.expectedReturn}% return:
                        </p>
                        <p className={`text-sm font-medium ${
                          willReachGoal 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          You'll reach {formatCurrency(projectedAmount, currency)} 
                          {willReachGoal 
                            ? ` (${Math.round((projectedAmount / goal.targetAmount - 1) * 100)}% over target)`
                            : ` (${Math.round((1 - projectedAmount / goal.targetAmount) * 100)}% short of target)`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
