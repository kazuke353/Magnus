import { useState, useRef, useEffect } from "react";
import { FiUpload, FiCopy, FiX, FiCheck, FiAlertTriangle, FiMessageSquare } from "react-icons/fi";
import Button from "./Button";
import Card from "./Card";
import { formatDate } from "~/utils/date";

interface ImportTasksModalProps {
  onClose: () => void;
  onImport: (tasks: any[]) => void;
  isImporting: boolean;
}

export default function ImportTasksModal({
  onClose,
  onImport,
  isImporting
}: ImportTasksModalProps) {
  const [jsonText, setJsonText] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setParseError(null);
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setParseError("Please enter JSON data to import");
      return;
    }

    try {
      const parsedData = JSON.parse(jsonText);
      
      if (!Array.isArray(parsedData)) {
        throw new Error("Imported data must be an array of tasks");
      }
      
      // Validate each task has required fields
      parsedData.forEach((task, index) => {
        if (!task.title) {
          throw new Error(`Task at index ${index} is missing a title`);
        }
      });
      
      onImport(parsedData);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyPrompt = async () => {
    if (promptRef.current) {
      try {
        await navigator.clipboard.writeText(promptRef.current.value);
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy prompt:", error);
      }
    }
  };

  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate.toISOString());
  const isoDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  const llmPrompt = `I need help organizing my tasks. Please convert the following list of tasks into a structured JSON array that I can import into my task management app.

Today's date is ${formattedDate} (${isoDate}).

For each task, please determine:
1. A clear title (required)
2. A detailed description (optional)
3. A suitable due date in YYYY-MM-DD format (optional)
4. A priority level: "low", "medium", or "high" (default to "medium")
5. A category that makes sense (optional)
6. An amount if it's a financial task (optional, numeric)

Here's the expected JSON structure:
[
  {
    "title": "Task name",
    "description": "Detailed description",
    "dueDate": "2023-12-31",
    "priority": "high",
    "category": "work",
    "amount": 100
  },
  ...
]

Please organize these tasks intelligently, considering:
- Tasks that seem urgent should be high priority
- Group similar tasks into the same category
- Suggest reasonable due dates based on task complexity and today's date (${isoDate})
- Add helpful descriptions that clarify the task

Here are my tasks:
[PASTE YOUR TASKS HERE, ONE PER LINE]

Please respond with ONLY the valid JSON array that I can copy directly into my app.`;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Import Tasks
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md">
            <div className="flex">
              <FiMessageSquare className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                  Use an AI assistant to help organize your tasks. Copy the prompt below, paste it to your favorite AI assistant, and then copy the JSON response back here.
                </p>
                <div className="relative">
                  <textarea
                    ref={promptRef}
                    className="w-full h-32 p-3 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    readOnly
                    value={llmPrompt}
                  />
                  <Button 
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPrompt}
                  >
                    {promptCopied ? (
                      <>
                        <FiCheck className="mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <FiCopy className="mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paste JSON Task Data
            </label>
            <textarea
              id="json-input"
              ref={textAreaRef}
              className="w-full h-64 p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder='[
  {
    "title": "Task name",
    "description": "Detailed description",
    "dueDate": "2023-12-31",
    "priority": "high",
    "category": "work",
    "amount": 100
  }
]'
              value={jsonText}
              onChange={handleTextChange}
            />
          </div>

          {parseError && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              isLoading={isImporting}
              disabled={!jsonText.trim() || isImporting}
            >
              <FiUpload className="mr-2" />
              Import Tasks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
