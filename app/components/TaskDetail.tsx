import { format } from 'date-fns';
import { Task } from '~/db/schema';
import Button from './Button';
import { FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

interface TaskDetailProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onClose: () => void;
}

export default function TaskDetail({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onClose
}: TaskDetailProps) {
  const priorityColors = {
    low: 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 text-blue-800 dark:text-blue-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-20 text-yellow-800 dark:text-yellow-300',
    high: 'bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-800 dark:text-red-300'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {task.title}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiX size={20} />
        </button>
      </div>
      
      <div className="space-y-4">
        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{task.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          {task.dueDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {format(new Date(task.dueDate), 'PPP')}
              </p>
            </div>
          )}
          
          {task.category && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">{task.category}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</h3>
            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          </div>
          
          {task.amount !== null && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                ${task.amount.toFixed(2)}
              </p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
              task.completed
                ? 'bg-green-100 dark:bg-green-900 dark:bg-opacity-20 text-green-800 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            }`}>
              {task.completed ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => onToggleComplete(task.id, !task.completed)}
        >
          {task.completed ? (
            <>
              <FiX className="mr-2" />
              Mark Incomplete
            </>
          ) : (
            <>
              <FiCheck className="mr-2" />
              Mark Complete
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onEdit(task)}
        >
          <FiEdit className="mr-2" />
          Edit
        </Button>
        
        <Button
          variant="danger"
          onClick={() => onDelete(task.id)}
        >
          <FiTrash2 className="mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
