import { Outlet, Link, useLocation, NavLink } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FiHome, FiDollarSign, FiMessageSquare, FiCalendar, FiSettings, FiTarget, FiMenu, FiX } from "react-icons/fi";
import { ToastContainer } from "~/components/ToastContainer";

export default function AppLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: "/dashboard", icon: FiHome, label: "Dashboard" },
    { to: "/portfolio", icon: FiDollarSign, label: "Portfolio" },
    { to: "/goals", icon: FiTarget, label: "Goals" },
    { to: "/tasks", icon: FiCalendar, label: "Tasks" },
    { to: "/chat", icon: FiMessageSquare, label: "Chat" },
    { to: "/settings", icon: FiSettings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <FiX className="h-6 w-6 text-gray-900 dark:text-gray-100" />
          ) : (
            <FiMenu className="h-6 w-6 text-gray-900 dark:text-gray-100" />
          )}
        </button>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-5">
              <Link to="/dashboard" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Magnus</span>
              </Link>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <item.icon
                    className="mr-3 flex-shrink-0 h-6 w-6"
                    aria-hidden="true"
                  />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
            <Link
              to="/logout"
              className="flex-shrink-0 group block w-full"
            >
              <div className="flex items-center">
                <div>
                  <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <span className="text-sm font-medium">👋</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Logout
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex flex-col max-w-xs w-full bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex-1 flex flex-col min-h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between px-4 mb-5">
                <Link to="/dashboard" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Magnus</span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon
                      className="mr-3 flex-shrink-0 h-6 w-6"
                      aria-hidden="true"
                    />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
              <Link
                to="/logout"
                className="flex-shrink-0 group block w-full"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <div>
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <span className="text-sm font-medium">👋</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                      Logout
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-8 pt-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast container for notifications */}
      <ToastContainer />
    </div>
  );
}
