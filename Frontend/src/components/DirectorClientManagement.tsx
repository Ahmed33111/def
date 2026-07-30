import React, { useState, useEffect } from 'react';
import { 
  Users, Search, ArrowUpRight, ArrowDownRight, 
  Eye, Trash2, Edit, Plus, X 
} from 'lucide-react';
import { apiUrl } from '../api';

interface Client {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  accounts: Account[];
}

interface Account {
  id: number;
  accountNumber: string;
  balance: number;
  status: string;
}

interface TransactionModal {
  isOpen: boolean;
  type: 'DEPOSIT' | 'WITHDRAW';
  accountId: number | null;
  accountNumber: string;
}

interface ViewModal {
  isOpen: boolean;
  client: Client | null;
}

interface DirectorClientManagementProps {
  onLogout?: () => void;
}

export default function DirectorClientManagement({ onLogout }: DirectorClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [transactionModal, setTransactionModal] = useState<TransactionModal>({
    isOpen: false,
    type: 'DEPOSIT',
    accountId: null,
    accountNumber: ''
  });
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [viewModal, setViewModal] = useState<ViewModal>({
    isOpen: false,
    client: null
  });

  // Charger les clients
  useEffect(() => {
    fetchClients();
  }, []);

  const handleAuthFailure = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onLogout?.();
      return true;
    }
    return false;
  };

  const fetchClients = async () => {
    try {
      const credentials = localStorage.getItem('credentials');
      const response = await fetch(apiUrl('/api/director/clients'), {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      if (handleAuthFailure(response)) {
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour effectuer un dépôt ou retrait
  const handleTransaction = async () => {
    if (!transactionModal.accountId || !amount) return;

    try {
      const credentials = localStorage.getItem('credentials');
      const endpoint = transactionModal.type === 'DEPOSIT' ? 'deposit' : 'withdraw';
      
      const response = await fetch(
        apiUrl(`/api/director/accounts/${transactionModal.accountId}/${endpoint}`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            description: description || `${transactionModal.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} par le directeur`
          })
        }
      );

      if (response.ok) {
        // Rafraîchir la liste des clients
        await fetchClients();
        // Réinitialiser le formulaire
        setTransactionModal({
          isOpen: false,
          type: 'DEPOSIT',
          accountId: null,
          accountNumber: ''
        });
        setAmount('');
        setDescription('');
      } else {
        const error = await response.json();
        alert(error.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      alert('Une erreur est survenue lors de la transaction');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Clients</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comptes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients
                .filter(client => 
                  client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(client => (
                  <tr key={client.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{client.fullName}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        <div className="text-sm text-gray-500">{client.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {client.accounts.map(account => (
                          <div key={account.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {account.accountNumber}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatAmount(account.balance)}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setTransactionModal({
                                  isOpen: true,
                                  type: 'DEPOSIT',
                                  accountId: account.id,
                                  accountNumber: account.accountNumber
                                })}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                              >
                                <ArrowDownRight className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setTransactionModal({
                                  isOpen: true,
                                  type: 'WITHDRAW',
                                  accountId: account.id,
                                  accountNumber: account.accountNumber
                                })}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setViewModal({ isOpen: true, client })}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de transaction */}
      {transactionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* En-tête du modal */}
            <div className="p-5 bg-gradient-to-r from-blue-500 to-blue-600">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {transactionModal.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'}
                  </h3>
                  <p className="text-sm text-blue-100 mt-1">
                    {transactionModal.type === 'DEPOSIT' 
                      ? 'Ajouter des fonds au compte client'
                      : 'Retirer des fonds du compte client'}
                  </p>
                </div>
                <button
                  onClick={() => setTransactionModal({ ...transactionModal, isOpen: false })}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Corps du modal */}
            <div className="p-5 space-y-4">
              {/* Information du compte */}
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-sm font-medium text-blue-600">Numéro de compte</p>
                <p className="text-base font-semibold text-blue-900 mt-0.5">{transactionModal.accountNumber}</p>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Montant de la transaction
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-4 pr-12 py-2.5 text-base font-medium border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.000"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-base font-medium">
                    TND
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Motif de la transaction
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-2.5 text-base font-normal border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description de la transaction..."
                  rows={2}
                />
              </div>
            </div>

            {/* Pied du modal */}
            <div className="p-5 bg-gray-50 border-t">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setTransactionModal({ ...transactionModal, isOpen: false })}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTransaction}
                  className={`px-4 py-2 text-sm font-medium rounded-xl text-white ${
                    transactionModal.type === 'DEPOSIT' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {transactionModal.type === 'DEPOSIT' ? 'Déposer' : 'Retirer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails client */}
      {viewModal.isOpen && viewModal.client && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">
                  Détails du client
                </h3>
                <button
                  onClick={() => setViewModal({ isOpen: false, client: null })}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Informations personnelles</h4>
                    <div className="mt-2 space-y-3">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-sm text-gray-500">Nom complet</p>
                        <p className="text-base font-medium text-gray-900">{viewModal.client.fullName}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-base font-medium text-gray-900">{viewModal.client.email}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-sm text-gray-500">Téléphone</p>
                        <p className="text-base font-medium text-gray-900">{viewModal.client.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Comptes bancaires</h4>
                    <div className="mt-2 space-y-3">
                      {viewModal.client.accounts.map(account => (
                        <div key={account.id} className="bg-gray-50 p-3 rounded-xl">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500">Numéro de compte</p>
                              <p className="text-base font-medium text-gray-900">{account.accountNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Solde</p>
                              <p className="text-base font-medium text-gray-900">
                                {formatAmount(account.balance)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm text-gray-500">Statut</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              account.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {account.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 