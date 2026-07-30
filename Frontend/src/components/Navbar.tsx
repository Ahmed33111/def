import React, { useState, useEffect } from 'react';
import { Menu, X, Settings, User, ChevronDown, CreditCard, Users, Building2, Landmark, Clock, LogOut, Wallet, BarChart3, PieChart, ArrowRightLeft, FileText } from 'lucide-react';
import ProfileComponent from './ProfileComponent';

interface NavbarProps {
  isLoggedIn: boolean;
  onLogout: () => void;
  username?: string;
  userRole?: string;
  fullName?: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  key: string;
  icon: React.ReactNode;
  text: string;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, onLogout, username, userRole, fullName, onTabChange }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }, [window.location.pathname]);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }, [isLoggedIn]);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case 'ROLE_ADMIN':
        return [
          { key: 'users', icon: <Users size={18} />, text: 'Utilisateurs' },
          { key: 'agencies', icon: <Building2 size={18} />, text: 'Agences' },
        ];
      case 'ROLE_DIRECTOR':
        return [
          { key: 'dashboard', icon: <BarChart3 size={18} />, text: 'Tableau de Bord' },
          { key: 'users', icon: <Users size={18} />, text: 'Gestion Utilisateurs' },
          { key: 'accounts', icon: <Wallet size={18} />, text: 'Comptes' },
        ];
      case 'ROLE_CASHIER':
        return [
          { key: 'dashboard', icon: <BarChart3 size={18} />, text: 'Tableau de Bord' },
          { key: 'accounts', icon: <Wallet size={18} />, text: 'Comptes' },
          { key: 'cards', icon: <CreditCard size={18} />, text: 'Cartes Bancaires' },
        ];
      case 'ROLE_USER':
      default:
        return [
          { key: 'dashboard', icon: <PieChart size={18} />, text: 'Tableau de Bord' },
          { key: 'accounts', icon: <Wallet size={18} />, text: 'Comptes' },
          { key: 'transfers', icon: <ArrowRightLeft size={18} />, text: 'Virements' },
          { key: 'documents', icon: <FileText size={18} />, text: 'Documents' },
        ];
    }
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    onLogout();
  };

  const handleNavItemClick = (key: string) => {
    onTabChange(key);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-[#1A45BA]"></div>
      
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/10"></div>
      
      <div className="absolute -bottom-6 left-0 right-0 h-6 
                    bg-gradient-to-b from-black/5 to-transparent 
                    pointer-events-none"></div>

      <div className="relative max-w-[95%] w-[95%] mx-auto">
        <div className="relative">
          <div className="flex items-center justify-between h-[67px]">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-white/10 rounded-xl backdrop-blur-sm"></div>
                    <Landmark className="h-6 w-6 text-white relative z-10 transform transition-transform group-hover:scale-105" />
                  </div>
                </div>
                
                <div className="flex items-center ml-3">
                  <span className="text-xl text-white font-exo font-bold leading-none tracking-wide mt-[2px]">
                    E-Bank
                  </span>
                </div>
              </div>
            </div>

            {isLoggedIn && (
              <div className="hidden md:flex items-center space-x-2">
                {getNavItems().map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavItemClick(item.key)}
                    className="flex items-center space-x-2 px-4 py-2 text-white/90 rounded-xl 
                             hover:bg-white/10 transition-all duration-200 border border-transparent
                             hover:border-white/10 backdrop-blur-sm"
                  >
                    {item.icon}
                    <span className="font-medium">{item.text}</span>
                  </button>
                ))}
              </div>
            )}

            {isLoggedIn && (
              <div className="hidden md:flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/30"></div>
                  </div>
                  <span className="text-white/90 text-sm font-light">
                    {formatDateTime(currentDateTime)}
                  </span>
                </div>

                <div className="h-6 w-[1px] bg-white/10"></div>

                <div className="relative">
                  <div 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div>
                        <p className="text-white/90 text-sm font-light">{fullName || username}</p>
                        <p className="text-white/50 text-xs">{userRole?.replace('ROLE_', '')}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    </div>
                  </div>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-sm text-gray-900">{fullName || username}</p>
                        <p className="text-xs text-gray-500">{userRole?.replace('ROLE_', '')}</p>
                      </div>

                      <div className="py-1">
                        <div 
                          onClick={() => {
                            setShowProfile(true);
                            setIsProfileOpen(false);
                          }}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
                        >
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          Mon Profil
                        </div>

                        <div 
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
                        >
                          <Settings className="h-4 w-4 text-gray-400 mr-2" />
                          Paramètres
                        </div>
                      </div>

                      <div className="border-t border-gray-100">
                        <div
                          onClick={handleLogout}
                          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Déconnexion
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                {isMobileMenuOpen ? 
                  <X size={20} className="text-white" /> : 
                  <Menu size={20} className="text-white" />
                }
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && isLoggedIn && (
          <div className="md:hidden w-full mt-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
            <div className="p-4 space-y-2">
              {getNavItems().map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavItemClick(item.key)}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-white rounded-xl 
                           hover:bg-white/10 transition-all duration-200 border border-transparent
                           hover:border-white/10"
                >
                  {item.icon}
                  <span>{item.text}</span>
                </button>
              ))}
              <div className="border-t border-white/10 my-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2.5 text-white/90 hover:text-red-200 
                           hover:bg-white/10 rounded-xl transition-all duration-200"
                >
                  <LogOut size={18} className="mr-2" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <ProfileComponent 
          isOpen={showProfile} 
          onClose={() => setShowProfile(false)} 
        />
      </div>
    </nav>
  );
};

export default Navbar;
