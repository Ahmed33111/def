import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Calendar, Shield, Edit2, X, Check } from 'lucide-react';
import { apiUrl } from '../api';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  address: string;
  phone: string;
  createdAt?: string;
}

interface ProfileComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConnectionDates {
  lastConnection: string;
  currentConnection: string;
}

export default function ProfileComponent({ isOpen, onClose }: ProfileComponentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionDates, setConnectionDates] = useState<ConnectionDates>({
    lastConnection: localStorage.getItem('lastLogin') || 'Première connexion',
    currentConnection: localStorage.getItem('currentLogin') || new Date().toLocaleString('fr-FR')
  });

  useEffect(() => {
    if (isOpen) {
      setConnectionDates({
        lastConnection: localStorage.getItem('lastLogin') || 'Première connexion',
        currentConnection: localStorage.getItem('currentLogin') || new Date().toLocaleString('fr-FR')
      });
      
      fetchUserProfile();
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/users/profile'), {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setError('Erreur lors du chargement du profil');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="p-6">
          {/* En-tête */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <User className="mr-2 text-blue-600" size={24} />
              Mon Profil
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : profile && (
            <div className="space-y-6">
              {/* Photo de profil et informations principales */}
              <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="h-24 w-24 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{profile.fullName}</h3>
                  <p className="text-gray-500">{profile.username}</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mt-2">
                    {profile.role.replace('ROLE_', '')}
                  </span>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Phone className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="text-gray-900">{profile.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="text-gray-900">{profile.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Date d'inscription</p>
                      <p className="text-gray-900">
                        {new Date().toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sécurité */}
              <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="flex items-center space-x-3">
                  <Shield className="text-yellow-600" size={20} />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-800">Sécurité du compte</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-yellow-600">
                        Connexion actuelle : {connectionDates.currentConnection}
                      </p>
                      <p className="text-sm text-yellow-600">
                        Connexion précédente : {connectionDates.lastConnection}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 