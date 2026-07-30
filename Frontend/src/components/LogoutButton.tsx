import React from 'react';

interface LogoutButtonProps {
  onLogout: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  return (
    <button 
      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 
                 text-white rounded-lg transition-all duration-200 ease-in-out 
                 transform hover:scale-105 focus:outline-none focus:ring-2 
                 focus:ring-red-500 focus:ring-opacity-50 shadow-md"
      onClick={onLogout}
    >
      <svg 
        className="h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
        />
      </svg>
      <span className="hidden md:block">Déconnexion</span>
    </button>
  );
};

export default LogoutButton; 