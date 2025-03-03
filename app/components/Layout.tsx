import { Link, NavLink, useLocation } from "@remix-run/react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Tasks", href: "/tasks" },
    { name: "Chat", href: "/chat" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 bg-gray-600 bg-opacity-75 z-30 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:hidden`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Portfolio Manager
            </Link>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `block px-4 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/logout"
              className="block px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Link to="/" className="text-xl font-bold text-blue-600">
                Portfolio Manager
              </Link>
            </div>
            <nav className="mt-8 flex-1 px-4 bg-white space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Link
              to="/logout"
              className="flex-shrink-0 w-full group block px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-white py-4 px-4 border-b border-gray-200 shadow-sm">
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <svg
            className="block h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex-1 flex justify-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Portfolio Manager
          </Link>
        </div>
        <div className="w-10"></div> {/* Spacer to center the title */}
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
