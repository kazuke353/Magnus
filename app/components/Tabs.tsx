import { useState, ReactNode } from 'react';

    interface TabItem {
      id: string;
      label: string;
      disabled?: boolean;
    }

    interface TabsProps {
      items: TabItem[];
      initialTabId?: string;
      children: (activeTab: TabItem) => ReactNode; // Function as child pattern
      className?: string;
    }

    export default function Tabs({
      items,
      initialTabId,
      children,
      className = ''
    }: TabsProps) {
      const [activeTabId, setActiveTabId] = useState(initialTabId || items[0]?.id);

      const activeTab = items.find(item => item.id === activeTabId) || items[0];

      return (
        <div className={className}>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4 overflow-x-auto px-4" aria-label="Tabs">
              {items.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  disabled={tab.disabled}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                    ${
                      tab.id === activeTabId
                        ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                    }
                    ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  aria-current={tab.id === activeTabId ? 'page' : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-2">
            {activeTab && children(activeTab)}
          </div>
        </div>
      );
    }
