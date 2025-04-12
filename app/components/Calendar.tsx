import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, getDay } from 'date-fns'; // Import getDay
import { FiChevronLeft, FiChevronRight, FiRepeat } from 'react-icons/fi';
import { Task } from '~/db/schema';
import Tooltip from './Tooltip';

interface CalendarProps {
  tasks: Task[];
  recurringTasks?: Task[];
  onSelectDate: (date: Date) => void;
  onSelectTask: (task: Task) => void;
}

export default function Calendar({
  tasks = [],
  recurringTasks = [],
  onSelectDate,
  onSelectTask
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day names for header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate the day of the week for the first day of the month (0 for Sunday, 1 for Monday, etc.)
  const firstDayOfMonthWeekday = getDay(monthStart);

  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Combine regular and recurring tasks
  const allTasks = [...tasks, ...recurringTasks];

  const getTasksForDay = (day: Date) => {
    if (!allTasks || !Array.isArray(allTasks)) return [];

    return allTasks.filter(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = parseISO(task.dueDate);
        return isSameDay(taskDate, day);
      } catch (error) {
        console.error("Error parsing date:", error);
        return false;
      }
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Previous month"
          >
            <FiChevronLeft className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Next month"
          >
            <FiChevronRight className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {weekDays.map(day => (
          <div key={day} className="text-center py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {/* Add empty cells for days before the first day of the month */}
        {Array.from({ length: firstDayOfMonthWeekday }).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 dark:bg-gray-800/50"></div>
        ))}

        {/* Render the actual days of the month */}
        {monthDays.map(day => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth); // Should always be true for monthDays
          const isCurrentDay = isToday(day);

          // Check if there are recurring tasks for this day
          const hasRecurringTasks = dayTasks.some(task => task.isRecurring || task.recurringPatternId);

          return (
            <div
              key={day.toString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[100px] p-2 bg-white dark:bg-gray-800 ${
                !isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : '' // This condition might be redundant now
              } ${
                isCurrentDay ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' : ''
              } hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer`}
            >
              <div className="flex justify-between items-center">
                <div className={`text-right ${
                  isCurrentDay ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                }`}>
                  {format(day, 'd')}
                </div>

                {hasRecurringTasks && (
                  <Tooltip content="Contains recurring tasks">
                    <FiRepeat className="text-purple-500 dark:text-purple-400" size={14} />
                  </Tooltip>
                )}
              </div>

              <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task);
                    }}
                    className={`text-xs p-1 rounded truncate flex items-center ${
                      task.completed
                        ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-20 text-green-800 dark:text-green-300 line-through'
                        : task.priority === 'high'
                        ? 'bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-800 dark:text-red-300'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-20 text-yellow-800 dark:text-yellow-300'
                        : 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {(task.isRecurring || task.recurringPatternId) && (
                      <FiRepeat className="mr-1 flex-shrink-0" size={10} />
                    )}
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
