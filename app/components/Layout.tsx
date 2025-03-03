import { Link, useLocation } from "@remix-run/react";
import { useState } from "react";
import { FiMenu, FiX, FiHome, FiSettings, FiMessageSquare, FiCalendar, FiPieChart } from "react-icons/fi";
import { User } from "~/db/schema";

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path) ? "bg-blue-700 text-white" : "text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900";
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden text-gray-700 dark:text-gray-200 focus:outline-none"
        onClick={toggleMenu}
      >
        {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">FinanceTracker</h1>
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/dashboard')}`}
              onClick={closeMenu}
            >
              <FiHome className="mr-3 h-5 w-5" />
              Dashboard
            </Link>
            
            <Link
              to="/tasks"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/tasks')}`}
              onClick={closeMenu}
            >
              <FiCalendar className="mr-3 h-5 w-5" />
              Tasks & Schedule
            </Link>
            
            <Link
              to="/chat"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/chat')}`}
              onClick={closeMenu}
            >
              <FiMessageSquare className="mr-3 h-5 w-5" />
              Chat Assistant
            </Link>
            
            <Link
              to="/portfolio"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/portfolio')}`}
              onClick={closeMenu}
            >
              <FiPieChart className="mr-3 h-5 w-5" />
              Portfolio
            </Link>
            
            <Link
              to="/settings"
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/settings')}`}
              onClick={closeMenu}
            >
              <FiSettings className="mr-3 h-5 w-5" />
              Settings
            </Link>
          </nav>
          
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.username}</p>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
