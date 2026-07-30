import React, { useState, useEffect } from 'react';
import { Users, Building2, ChartBar, Settings } from 'lucide-react';
import DirectorUserManagement from './DirectorUserManagement';
import DirectorClientManagement from './DirectorClientManagement';
import DirectorAgencyStats from './DirectorAgencyStats';
import { apiUrl } from '../api';

interface DirectorDashboardProps {
  onLogout?: () => void;
}

export default function DirectorDashboard({ onLogout }: DirectorDashboardProps) {
  const [activeTab, setActiveTab] = useState('stats');
  const [agencyInfo, setAgencyInfo] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchAgencyInfo = async () => {
      try {
        const credentials = localStorage.getItem('credentials');
        const response = await fetch(apiUrl('/api/users/agency-info'), {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.status === 401 || response.status === 403) {
          if (onLogout) onLogout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setAgencyInfo(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des informations de l\'agence:', error);
      }
    };

    fetchAgencyInfo();
  }, [onLogout]);

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <DirectorUserManagement onLogout={onLogout} />;
      case 'clients':
        return <DirectorClientManagement onLogout={onLogout} />;
      case 'stats':
        return <DirectorAgencyStats onLogout={onLogout} />;
      default:
        return <DirectorAgencyStats onLogout={onLogout} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed top-[67px] left-0 bottom-0 w-80 bg-white shadow-lg border-r border-gray-100">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Espace Directeur</h2>
            <p className="text-sm text-gray-500">Gestion de l'agence</p>
            {agencyInfo && (
              <p className="text-sm text-blue-600 mt-1">Agence {agencyInfo.name}</p>
            )}
          </div>

          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center w-full px-4 py-2.5 rounded-lg transition-all ${
                  activeTab === 'stats' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ChartBar className="h-5 w-5 mr-3" />
                Statistiques Agence
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center w-full px-4 py-2.5 rounded-lg transition-all ${
                  activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                Gestion Personnel
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`flex items-center w-full px-4 py-2.5 rounded-lg transition-all ${
                  activeTab === 'clients' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-5 w-5 mr-3" />
                Gestion Clients
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-80 p-8 pt-[90px]">
        {renderContent()}
      </div>
    </div>
  );
} 