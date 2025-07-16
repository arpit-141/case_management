import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OC</span>
              </div>
              <span className="text-xl font-bold text-gray-900">OpenSearch Cases</span>
            </Link>
            
            <nav className="hidden md:flex space-x-1">
              <Link
                to="/cases"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/cases') || isActive('/')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Cases
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/cases/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create Case
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;