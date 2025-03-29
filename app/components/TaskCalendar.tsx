import { useState } from 'react';
import Calendar from './Calendar'
import { format, isEqual, parseISO, isValid, isSameDay } from 'date-fns';
import { Task } from '~/db/schema';
import Card from './Card';
import TaskItem from './TaskItem';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus } from 'react-icons/fi';
import Button from './Button';
import EmptyState from './EmptyState';

// Import calendar styles
import '~/styles/calendar.css';

interface TaskCalendarProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onTaskClick?: (taskId: string) => void;
  onDateClick?: (date: Date) => void;
  currency?: string;
}

export default function TaskCalendar({
  tasks,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onTaskClick,
  onDateClick,
  currency = "$"
}: TaskCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter(task => {
    if (!task.dueDate) return false;
    
    try {
      const taskDate = parseISO(task.dueDate);
      if (!isValid(taskDate)) return false;
      
      return isSameDay(taskDate, selectedDate);
    } catch (error) {
      console.error("Error parsing date:", error);
      return false;
    }
  });

  // Function to check if a date has tasks
  const hasTasksOnDate = (date: Date) => {
    return tasks.some(task => {
      if (!task.dueDate) return false;
      
      try {
        const taskDate = parseISO(task.dueDate);
        if (!isValid(taskDate)) return false;
        
        return isSameDay(taskDate, date);
      } catch (error) {
        return false;
      }
    });
  };

  // Get task count for a specific date
  const getTaskCountForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      
      try {
        const taskDate = parseISO(task.dueDate);
        if (!isValid(taskDate)) return false;
        
        return isSameDay(taskDate, date);
      } catch (error) {
        return false;
      }
    }).length;
  };

  // Custom tile content to show indicators for dates with tasks
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const taskCount = getTaskCountForDate(date);
      if (taskCount > 0) {
        return (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Custom class for tiles
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const classes = ['relative', 'h-16'];
      
      if (hasTasksOnDate(date)) {
        classes.push('font-medium');
      }
      
      return classes.join(' ');
    }
    return '';
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
    if (onDateClick) {
      onDateClick(date);
    }
  };

  const handleAddTaskForDate = () => {
    if (onDateClick) {
      onDateClick(selectedDate);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          <FiCalendar className="inline-block mr-2" />
          {viewMode === 'month' ? 'Monthly View' : format(selectedDate, 'MMMM d, yyyy')}
        </h2>
        
        <div className="flex space-x-2">
          {viewMode === 'day' && (
            <Button
              variant="outline"
              onClick={() => setViewMode('month')}
              size="sm"
            >
              Back to Month
            </Button>
          )}
          
          {viewMode === 'day' && onDateClick && (
            <Button
              variant="primary"
              onClick={handleAddTaskForDate}
              size="sm"
            >
              <FiPlus className="mr-1" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      <div className="calendar-container">
        <style jsx global>{`
          .react-calendar {
            width: 100%;
            background-color: transparent;
            border: none;
            font-family: inherit;
          }
          .react-calendar__tile {
            padding: 0.75em 0.5em;
            position: relative;
            height: 80px;
          }
          .react-calendar__tile--now {
            background: rgba(59, 130, 246, 0.1);
          }
          .react-calendar__tile--active {
            background: rgba(59, 130, 246, 0.2);
            color: black;
          }
          .react-calendar__tile--active:enabled:hover,
          .react-calendar__tile--active:enabled:focus {
            background: rgba(59, 130, 246, 0.3);
          }
          .react-calendar__navigation button {
            min-width: 44px;
            background: none;
            font-size: 16px;
            margin-top: 8px;
          }
          .react-calendar__navigation button:disabled {
            background-color: transparent;
          }
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: rgba(59, 130, 246, 0.1);
          }
          .react-calendar__month-view__weekdays {
            text-align: center;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.75em;
          }
          .react-calendar__month-view__weekdays__weekday {
            padding: 0.5em;
          }
          .react-calendar__month-view__weekNumbers .react-calendar__tile {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75em;
            font-weight: bold;
          }
          
          /* Dark mode adjustments */
          .dark .react-calendar {
            color: #e5e7eb;
          }
          .dark .react-calendar__tile--now {
            background: rgba(59, 130, 246, 0.2);
          }
          .dark .react-calendar__tile--active {
            background: rgba(59, 130, 246, 0.3);
            color: white;
          }
          .dark .react-calendar__tile--active:enabled:hover,
          .dark .react-calendar__tile--active:enabled:focus {
            background: rgba(59, 130, 246, 0.4);
          }
          .dark .react-calendar__navigation button:enabled:hover,
          .dark .react-calendar__navigation button:enabled:focus {
            background-color: rgba(59, 130, 246, 0.2);
          }
          .dark .react-calendar__month-view__days__day--weekend {
            color: #f87171;
          }
        `}</style>

        {viewMode === 'month' ? (
          <Card>
            <Calendar
              onChange={(date) => handleDateClick(date as Date)}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              prevLabel={<FiChevronLeft />}
              nextLabel={<FiChevronRight />}
              prev2Label={null}
              next2Label={null}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <Card title={`Tasks for ${format(selectedDate, 'MMMM d, yyyy')}`}>
              {tasksForSelectedDate.length > 0 ? (
                <div className="space-y-3">
                  {tasksForSelectedDate.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onEdit={onEditTask || (() => {})}
                      onDelete={onDeleteTask || (() => {})}
                      onToggleComplete={onToggleComplete || (() => {})}
                      onSelect={onTaskClick ? () => onTaskClick(task.id) : undefined}
                      currency={currency}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FiCalendar className="h-12 w-12" />}
                  title="No tasks scheduled"
                  description="No tasks scheduled for this date. Add a task to get started."
                  actionLabel={onDateClick ? "Add Task" : undefined}
                  onAction={onDateClick ? handleAddTaskForDate : undefined}
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
