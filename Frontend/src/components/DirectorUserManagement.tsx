import React, { useState, useEffect } from 'react';
import { User, UserPlus, Search, Edit2, Trash, Mail, Phone, MapPin, X, Save, Users, Activity } from 'lucide-react';
import { apiUrl } from '../api';
import { validateUserForm } from '../utils/validation';

interface Cashier {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  password?: string;
}

interface Statistics {
  totalClients: number;
  totalTransactions: number;
  totalAccounts: number;
}

interface DirectorUserManagementProps {
  onLogout?: () => void;
}

export default function DirectorUserManagement({ onLogout }: DirectorUserManagementProps) {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCashier, setNewCashier] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    address: ''
  });
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchCashiers();
    fetchStatistics();
  }, []);

  const handleAuthFailure = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onLogout?.();
      return true;
    }
    return false;
  };

  const fetchCashiers = async () => {
    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/director/cashiers'), {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthFailure(response)) {
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setCashiers(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des caissiers:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/director/statistics'), {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (handleAuthFailure(response)) {
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
        console.log("Statistiques reçues:", data);
      } else {
        console.error('Erreur lors de la récupération des statistiques');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    }
  };

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUserForm(newCashier, true);
    if (validationError) {
      alert(validationError);
      return;
    }
    if (!newCashier.username || newCashier.username.length < 3) {
      alert('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return;
    }

    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/director/cashiers'), {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCashier)
      });

      if (response.ok) {
        setShowCreateForm(false);
        fetchCashiers();
        setNewCashier({
          username: '',
          password: '',
          fullName: '',
          email: '',
          phone: '',
          address: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création du caissier:', error);
    }
  };

  const handleDeleteCashier = async (cashierId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce caissier ?')) {
      return;
    }

    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl(`/api/director/cashiers/${cashierId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchCashiers(); // Rafraîchir la liste
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression du caissier');
    }
  };

  const handleUpdateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCashier) return;

    const validationError = validateUserForm(editingCashier);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl(`/api/director/cashiers/${editingCashier.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingCashier)
      });

      if (response.ok) {
        setShowEditForm(false);
        setEditingCashier(null);
        fetchCashiers(); // Rafraîchir la liste
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification du caissier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Caissiers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Caissiers</p>
              <p className="text-2xl font-bold text-blue-600">{cashiers.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Clients de l'agence */}
        {statistics && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Clients de l'agence</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.totalClients}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Transactions de l'agence */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Virements de l'agence</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.totalTransactions}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Barre d'actions */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un caissier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus size={20} className="mr-2" />
            Nouveau Caissier
          </button>
        </div>
      </div>

      {/* Liste des caissiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashiers
          .filter(cashier =>
            cashier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cashier.username.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(cashier => (
            <div key={cashier.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{cashier.fullName}</h3>
                  <p className="text-sm text-gray-500">@{cashier.username}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {cashier.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {cashier.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  {cashier.address}
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setEditingCashier(cashier);
                    setShowEditForm(true);
                  }}
                  className="px-3 py-1 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteCashier(cashier.id)}
                  className="px-3 py-1 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nouveau Caissier</h3>
              <button onClick={() => setShowCreateForm(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateCashier} className="space-y-4">
              {/* Champs du formulaire */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={newCashier.username}
                  onChange={(e) => setNewCashier({...newCashier, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={newCashier.password}
                  onChange={(e) => setNewCashier({...newCashier, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={newCashier.fullName}
                  onChange={(e) => setNewCashier({...newCashier, fullName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newCashier.email}
                  onChange={(e) => setNewCashier({...newCashier, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={newCashier.phone}
                  onChange={(e) => setNewCashier({...newCashier, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Adresse"
                  value={newCashier.address}
                  onChange={(e) => setNewCashier({...newCashier, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulaire de modification */}
      {showEditForm && editingCashier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Modifier le caissier</h3>
              <button onClick={() => setShowEditForm(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateCashier} className="space-y-4">
              <input
                type="text"
                value={editingCashier.fullName}
                onChange={(e) => setEditingCashier({...editingCashier, fullName: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Nom complet"
              />
              <input
                type="email"
                value={editingCashier.email}
                onChange={(e) => setEditingCashier({...editingCashier, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Email"
              />
              <input
                type="tel"
                value={editingCashier.phone}
                onChange={(e) => setEditingCashier({...editingCashier, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Téléphone"
              />
              <input
                type="text"
                value={editingCashier.address}
                onChange={(e) => setEditingCashier({...editingCashier, address: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Adresse"
              />
              <input
                type="password"
                onChange={(e) => setEditingCashier({...editingCashier, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Nouveau mot de passe (optionnel)"
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 