import { useState, useRef, useEffect } from "react";
import { FiUpload, FiCopy, FiX, FiCheck, FiAlertTriangle, FiMessageSquare, FiRepeat, FiInfo, FiToggleLeft, FiToggleRight } from "react-icons/fi"; // Added FiToggleLeft/Right
import Button from "./Button";
import Input from "./Input"; // Added Input for context
// Assuming Card, formatDate, formatDateWithDay, Tooltip are correctly imported
// import Card from "./Card";
import { formatDate, formatDateWithDay } from "~/utils/formatters"; // Adjust path as needed
import Tooltip from "./Tooltip"; // Adjust path as needed

interface ImportTasksModalProps {
  onClose: () => void;
  onImport: (tasks: any[]) => void; // Keep 'any[]' for flexibility, or define a strict Task type
  isImporting: boolean;
}

// Helper function to strip code blocks from imported text
const stripCodeBlocks = (text: string): string => {
  if (!text) return "";
  // This regex removes markdown code blocks and inline code
  return text.replace(/```(?:[a-zA-Z0-9]*\n)?(.*?)```/gs, "$1")
            .replace(/`(.*?)`/g, "$1")
            .trim();
};

export default function ImportTasksModal({
  onClose,
  onImport,
  isImporting
}: ImportTasksModalProps) {
  const [jsonText, setJsonText] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [importMode, setImportMode] = useState<'structure' | 'suggest'>('structure'); // 'structure' or 'suggest'
  const [aiContext, setAiContext] = useState<string>(""); // Context for AI suggestions
  const [llmPrompt, setLlmPrompt] = useState<string>(""); // Dynamic prompt state

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contextAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for context textarea

  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate.toISOString());
  const formattedDateWithDay = formatDateWithDay(currentDate.toISOString());
  const isoDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  // --- Generate Prompt based on Mode ---
  useEffect(() => {
    const baseJsonStructure = `[
  {
    "title": "Task Title",
    "description": "Detailed description",
    "dueDate": "${isoDate}",
    "priority": "medium",
    "category": "General",
    "amount": 50
  },
  {
    "title": "Recurring Task",
    "category": "Routine",
    "recurring": {
      "frequency": "weekly",
      "interval": 1,
      "daysOfWeek": "1"
    }
  }
]`;

    const baseInstructions = `
Today's date is ${formattedDateWithDay} (${isoDate}). Use this for date calculations.

For each task, determine:
1. title (string, required)
2. description (string, optional) - Be descriptive!
3. dueDate (string, optional, format: ${isoDate}) - Infer based on context and today's date.
4. priority (string, "low", "medium", "high", default: "medium") - Assess urgency.
5. category (string, optional) - Assign a relevant category (e.g., Work, Personal, Finance, Health).
6. amount (number, optional) - Extract numeric monetary value if mentioned.

For recurring tasks, add a "recurring" object with:
1. frequency (string, required: "daily", "weekly", "monthly", "yearly")
2. interval (number, optional, default: 1)
3. daysOfWeek (string, optional): Comma-separated days (1=Mon...7=Sun) for weekly.
4. dayOfMonth (number, optional): Day for monthly/yearly.
5. monthOfYear (number, optional): Month (1-12) for yearly.
6. occurrences (number, optional): Total repetitions.
7. endDate (string, optional, format: ${isoDate}): When recurrence stops.

Expected JSON structure example:
${baseJsonStructure}

Respond with ONLY the valid JSON array. No explanations or other text.`;

    if (importMode === 'structure') {
      setLlmPrompt(`Act as an expert task management assistant. Your goal is to analyze the list of raw, unstructured tasks provided below and convert them into a structured JSON array based on the rules provided.
${baseInstructions}

Please organize these raw tasks intelligently:
- Use "high" priority for urgent items.
- Group similar tasks into categories.
- Suggest reasonable due dates based on task context and today's date (${isoDate}).
- Add helpful descriptions.
- Identify recurring tasks and set appropriate patterns.

Here are my raw tasks (I will paste them below):
[PASTE YOUR TASKS HERE, ONE PER LINE OR AS A PARAGRAPH]
`);
    } else { // importMode === 'suggest'
      setLlmPrompt(`Act as an expert task management assistant. Based on the provided context and today's date, generate a list of relevant tasks and format them as a structured JSON array using the rules below.
${baseInstructions}

Generate tasks that are:
- Relevant to the provided context.
- Actionable and clear.
- Varied in terms of priority and type (including potential recurring tasks).
- Sensible for the current date (${isoDate}).

Context for task suggestions:
${aiContext ? aiContext : "[No specific context provided - suggest general tasks for today/this week]"}
`);
    }
  }, [importMode, aiContext, formattedDateWithDay, isoDate]); // Regenerate prompt when mode or context changes

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setParseError(null); // Clear error on text change
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setParseError("Please paste the JSON data generated by the AI assistant.");
      return;
    }
    try {
      const cleanedJson = stripCodeBlocks(jsonText);
      const parsedData = JSON.parse(cleanedJson);

      if (!Array.isArray(parsedData)) {
        throw new Error("Imported data must be a valid JSON array of task objects.");
      }
      // Basic validation (keep or enhance as needed)
      parsedData.forEach((task, index) => {
        if (typeof task !== 'object' || task === null) throw new Error(`Item at index ${index} is not a valid object.`);
        if (!task.title || typeof task.title !== 'string' || task.title.trim() === "") throw new Error(`Task at index ${index} is missing a valid 'title' (string).`);
        if (task.recurring) {
          if (typeof task.recurring !== 'object' || task.recurring === null) throw new Error(`Task at index ${index} has an invalid 'recurring' field.`);
          if (!task.recurring.frequency || typeof task.recurring.frequency !== 'string') throw new Error(`Recurring task at index ${index} is missing a 'frequency'.`);
          const validFreq = ["daily", "weekly", "monthly", "yearly"];
          if (!validFreq.includes(task.recurring.frequency.toLowerCase())) throw new Error(`Recurring task at index ${index} has an invalid frequency: '${task.recurring.frequency}'. Must be one of: ${validFreq.join(', ')}.`);
        }
        if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) console.warn(`Task at index ${index} dueDate ('${task.dueDate}') might not be YYYY-MM-DD.`);
        if (task.priority && !["low", "medium", "high"].includes(task.priority.toLowerCase())) console.warn(`Task at index ${index} has unrecognized priority ('${task.priority}').`);
      });
      onImport(parsedData);
    } catch (error) {
      let message = "Failed to parse JSON.";
      if (error instanceof SyntaxError) message = `Invalid JSON syntax: ${error.message}.`;
      else if (error instanceof Error) message = `Validation Error: ${error.message}.`;
      else message = `An unexpected error occurred: ${String(error)}`;
      setParseError(message);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Import Tasks via AI
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 space-y-4 overflow-y-auto">

          {/* Mode Toggle */}
          <div className="flex items-center justify-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode:</span>
            <button
              onClick={() => setImportMode('structure')}
              className={`px-3 py-1 rounded-md text-sm flex items-center ${importMode === 'structure' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <FiToggleLeft className={`mr-1 ${importMode === 'structure' ? 'text-white': 'text-gray-500'}`} /> Structure My Tasks
            </button>
            <button
              onClick={() => setImportMode('suggest')}
              className={`px-3 py-1 rounded-md text-sm flex items-center ${importMode === 'suggest' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
               <FiToggleRight className={`mr-1 ${importMode === 'suggest' ? 'text-white': 'text-gray-500'}`} /> Suggest Tasks For Me
            </button>
          </div>

          {/* AI Prompt Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md">
            <div className="flex">
              <FiMessageSquare className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Step 1: Use an AI to {importMode === 'structure' ? 'structure your tasks' : 'suggest tasks'}
                </p>
                 <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    Copy the prompt below. Paste it into your preferred AI assistant (like ChatGPT, Gemini, Claude){importMode === 'structure' ? ' along with your raw task list where indicated' : ''}.
                </p>

                {/* Context Input for Suggest Mode */}
                 {importMode === 'suggest' && (
                    <div className="mb-3">
                        <label htmlFor="aiContext" className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                            Provide Context for Suggestions (Optional):
                        </label>
                         <textarea
                            id="aiContext"
                            ref={contextAreaRef}
                            rows={2}
                            className="w-full p-2 text-sm border border-blue-300 dark:border-blue-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="e.g., Suggest tasks for a busy student this week, Help me plan my finances for next month, What should I do today for home maintenance?"
                            value={aiContext}
                            onChange={(e) => setAiContext(e.target.value)}
                            aria-label="Context for AI task suggestions"
                        />
                    </div>
                 )}

                {/* Prompt Display */}
                <div className="relative mb-2">
                  <textarea
                    ref={promptRef}
                    className="w-full h-36 p-3 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono resize-none"
                    readOnly
                    value={llmPrompt} // Use the dynamic prompt state
                    aria-label="AI Prompt for Task Processing"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPrompt}
                    aria-label={promptCopied ? "Prompt Copied" : "Copy Prompt"}
                  >
                    {promptCopied ? <><FiCheck className="mr-1 h-4 w-4" />Copied!</> : <><FiCopy className="mr-1 h-4 w-4" />Copy Prompt</>}
                  </Button>
                </div>
                {importMode === 'structure' && (
                    <p className="text-xs text-blue-600 dark:text-blue-500">
                        Remember to replace "[PASTE YOUR TASKS HERE...]" in the prompt with your actual tasks.
                    </p>
                )}
              </div>
            </div>
          </div>

          {/* Paste JSON Section */}
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-1">
              <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Step 2: Paste the AI's JSON Response
              </label>
              <Tooltip content="Paste the entire JSON array generated by the AI assistant here. Ensure it starts with '[' and ends with ']'.">
                <span className="text-gray-500 cursor-help"><FiInfo size={16} /></span>
              </Tooltip>
            </div>
            <textarea
              id="json-input"
              ref={textAreaRef}
              className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Paste the JSON output from the AI here. Example:\n${JSON.stringify([{title: "Example Task", category: "Demo", priority: "medium", recurring: {frequency:"daily"}}], null, 2)}`}
              value={jsonText}
              onChange={handleTextChange}
              aria-label="Paste JSON Task Data Here"
              aria-describedby="json-error-message"
            />
          </div>

          {/* Recurring Task Info Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-md">
            <div className="flex">
              <FiRepeat className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Recurring Tasks:</strong> Ensure the generated JSON includes a "recurring" object with "frequency" for recurring tasks.
              </p>
            </div>
          </div>

          {/* Parse Error Display */}
          {parseError && (
            <div id="json-error-message" role="alert" className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            isLoading={isImporting}
            disabled={!jsonText.trim() || isImporting || !!parseError}
            aria-disabled={!jsonText.trim() || isImporting || !!parseError}
          >
            <FiUpload className="mr-2 h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import Tasks'}
          </Button>
        </div>
      </div>
    </div>
  );
}
