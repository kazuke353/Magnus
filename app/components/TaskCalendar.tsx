import { useState } from 'react';
import Calendar from 'react-calendar';
import { format, isEqual, parseISO, isValid } from 'date-fns';
import { Task } from '~/db/schema';
import Card from './Card';
import TaskItem from './TaskItem';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

// Import calendar styles
import 'react-calendar/dist/Calendar.css';

interface TaskCalendarProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export default function TaskCalendar({
  tasks,
  onEditTask,
  onDeleteTask,
  onToggleComplete
}: TaskCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  // Filter tasks for the selected date
  const tasksForSelectedDate = tasks.filter(task => {
    if (!task.dueDate) return false;
    
    try {
      const taskDate = parseISO(task.dueDate);
      if (!isValid(taskDate)) return false;
      
      return isEqual(
        new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()),
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      );
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
        
        return isEqual(
          new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()),
          new Date(date.getFullYear(), date.getMonth(), date.getDate())
        );
      } catch (error) {
        return false;
      }
    });
  };

  // Custom tile content to show indicators for dates with tasks
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && hasTasksOnDate(date)) {
      return (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
        </div>
      );
    }
    return null;
  };

  // Custom class for tiles
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const classes = ['relative', 'h-12'];
      
      if (hasTasksOnDate(date)) {
        classes.push('font-medium');
      }
      
      return classes.join(' ');
    }
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          <FiCalendar className="inline-block mr-2" />
          {viewMode === 'month' ? 'Monthly View' : format(selectedDate, 'MMMM d, yyyy')}
        </h2>
        
        {viewMode === 'day' && (
          <button
            onClick={() => setViewMode('month')}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Back to Month
          </button>
        )}
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
              onChange={(date) => {
                setSelectedDate(date as Date);
                setViewMode('day');
              }}
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
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onToggleComplete={onToggleComplete}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                  No tasks scheduled for this date.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
