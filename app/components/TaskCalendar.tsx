import { useMemo, useState, useEffect } from 'react'; // Added useEffect
import Calendar from 'react-calendar'; // Use react-calendar
import { format, isEqual, parseISO, isValid, isSameDay } from 'date-fns';
import { Task } from '~/db/schema';
import Card from './Card';
import TaskItem from './TaskItem';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus } from 'react-icons/fi';
import Button from './Button';
import EmptyState from './EmptyState';
import Tooltip from './Tooltip'; // Import Tooltip
import { FiRepeat } from 'react-icons/fi'; // Import FiRepeat

// Import calendar styles
import '~/styles/calendar.css';

interface TaskCalendarProps {
  tasks: Task[];
  recurringTasks?: Task[]; // Keep recurring tasks separate for potential indicators
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onTaskClick?: (taskId: string) => void;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date | null; // Add prop for selected date
  currency?: string;
}

export default function TaskCalendar({
  tasks = [],
  recurringTasks = [], // Keep receiving recurring tasks
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onTaskClick,
  onDateClick,
  selectedDate, // Receive selected date
  currency = "$"
}: TaskCalendarProps) {
  const [activeStartDate, setActiveStartDate] = useState(selectedDate || new Date());

  // Combine regular and recurring tasks for checking dates
  const allTasks = useMemo(() => {
    // Combine tasks and occurrences from recurring tasks
    const occurrences = recurringTasks?.flatMap(rt => rt.occurrences || []) || [];
    const combined = [...tasks, ...occurrences];
    // Deduplicate based on ID
    return Array.from(new Map(combined.map(task => [task.id, task])).values());
  }, [tasks, recurringTasks]);


  // Function to check if a date has tasks
  const hasTasksOnDate = (date: Date): boolean => {
    return allTasks.some(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = parseISO(task.dueDate);
        return isValid(taskDate) && isSameDay(taskDate, date);
      } catch { return false; }
    });
  };

  // Function to check if a date has recurring tasks (based on parent task)
  const hasRecurringParentOnDate = (date: Date): boolean => {
    return recurringTasks?.some(rt => {
      // This is a simplified check. A real implementation might need
      // to calculate if the recurring pattern falls on this date.
      // For now, we just check if any recurring task *template* exists.
      // A better approach would involve calculating occurrences for the view.
      return true; // Placeholder: Assume all recurring tasks might apply
    }) || false;
  };


  // Custom tile content to show indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const tasksOnThisDate = allTasks.filter(task => {
        if (!task.dueDate) return false;
        try {
          const taskDate = parseISO(task.dueDate);
          return isValid(taskDate) && isSameDay(taskDate, date);
        } catch { return false; }
      });

      const taskCount = tasksOnThisDate.length;
      const hasRecurring = tasksOnThisDate.some(t => t.isRecurring || t.parentTaskId); // Check if any task on this day is recurring related

      if (taskCount > 0) {
        return (
          <div className="absolute bottom-1 left-1 right-1 flex justify-center items-center space-x-1">
            {hasRecurring && <FiRepeat className="text-purple-500 dark:text-purple-400 text-xs" />}
            <span className={`text-xs font-medium rounded-full px-1 ${taskCount > 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}>
              {taskCount}
            </span>
          </div>
        );
      }
    }
    return null;
  };

  // Custom class for tiles
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const classes = ['react-calendar__tile', 'relative', 'h-20']; // Increased height
      if (selectedDate && isSameDay(date, selectedDate)) {
        classes.push('!bg-blue-200 dark:!bg-blue-700'); // Use ! to override default active styles if needed
      }
      return classes.join(' ');
    }
    return 'react-calendar__tile';
  };

  const handleDateChange = (value: Date | Date[] | null) => {
    if (value instanceof Date && onDateClick) {
      onDateClick(value);
      setActiveStartDate(value); // Keep calendar view centered
    }
  };

  // Update active start date when selectedDate prop changes externally
  useEffect(() => {
    if (selectedDate) {
      setActiveStartDate(selectedDate);
    }
  }, [selectedDate]);


  return (
    <div className="calendar-container">
      {/* Styles remain the same */}
      <style jsx global>{`
            .react-calendar { width: 100%; background-color: transparent; border: none; font-family: inherit; }
            .react-calendar__tile { padding: 0.5em 0.25em; position: relative; height: 5rem; /* 80px */ text-align: right; vertical-align: top; } /* Adjusted padding and alignment */
            .react-calendar__tile abbr { position: absolute; top: 4px; right: 4px; } /* Position date number */
            .react-calendar__tile--now { background: rgba(59, 130, 246, 0.1); }
            .dark .react-calendar__tile--now { background: rgba(59, 130, 246, 0.2); }
            .react-calendar__tile--active { background: rgba(59, 130, 246, 0.2); color: inherit; } /* Default active style */
            .dark .react-calendar__tile--active { background: rgba(59, 130, 246, 0.3); color: inherit; }
            .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus { background: rgba(59, 130, 246, 0.3); }
            .dark .react-calendar__tile--active:enabled:hover, .dark .react-calendar__tile--active:enabled:focus { background: rgba(59, 130, 246, 0.4); }
            /* Custom selected date style */
            .react-calendar__tile.selected-date { background-color: #93c5fd !important; /* Tailwind blue-300 */ }
            .dark .react-calendar__tile.selected-date { background-color: #3b82f6 !important; /* Tailwind blue-500 */ }

            .react-calendar__navigation button { min-width: 44px; background: none; font-size: 1rem; margin-top: 8px; }
            .react-calendar__navigation button:disabled { background-color: transparent; opacity: 0.5; }
            .react-calendar__navigation button:enabled:hover, .react-calendar__navigation button:enabled:focus { background-color: rgba(59, 130, 246, 0.1); }
            .dark .react-calendar__navigation button:enabled:hover, .dark .react-calendar__navigation button:enabled:focus { background-color: rgba(59, 130, 246, 0.2); }
            .react-calendar__month-view__weekdays { text-align: center; text-transform: uppercase; font-weight: bold; font-size: 0.75em; color: #6b7280; } /* Gray-500 */
            .dark .react-calendar__month-view__weekdays { color: #9ca3af; } /* Gray-400 */
            .react-calendar__month-view__weekdays__weekday { padding: 0.5em; }
            .react-calendar__month-view__days__day--neighboringMonth { color: #9ca3af; } /* Gray-400 */
            .dark .react-calendar__month-view__days__day--neighboringMonth { color: #4b5563; } /* Gray-600 */
            .dark .react-calendar { color: #e5e7eb; }
          `}</style>
      <Calendar
        onChange={handleDateChange as any} // Cast to any to handle potential type mismatch if needed
        value={selectedDate}
        tileContent={tileContent}
        tileClassName={tileClassName}
        activeStartDate={activeStartDate} // Control the displayed month
        onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveStartDate(activeStartDate)} // Update state on month change
        className="border-none" // Remove default border
      />
    </div>
  );
}
