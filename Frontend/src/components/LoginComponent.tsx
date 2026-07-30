'use client'

import React, { useState } from 'react'
import { User, Lock, AlertCircle, LogIn, Eye, EyeOff, Landmark, UserPlus } from 'lucide-react'
import { apiUrl } from '../api'

interface LoginProps {
  onLogin: (role: string, username: string, fullName: string) => void
  onShowSignUp: () => void
}

export default function LoginComponent({ onLogin, onShowSignUp }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const credentials = btoa(`${username}:${password}`)
      
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        const previousLogin = localStorage.getItem('currentLogin');
        if (previousLogin) {
          localStorage.setItem('lastLogin', previousLogin);
        }
        
        const currentLogin = new Date().toLocaleString('fr-FR');
        localStorage.setItem('currentLogin', currentLogin);
        
        localStorage.setItem('credentials', credentials)
        localStorage.setItem('userRole', data.role)
        localStorage.setItem('userId', data.id)
        localStorage.setItem('username', username)
        localStorage.setItem('fullName', data.fullName)
        onLogin(data.role, username, data.fullName)
      } else {
        if (response.status === 429) {
          const timeUnit = data.isLongBlock ? 'heures' : 'minutes';
          setError(`${data.message}`);
          if (data.isLongBlock) {
            setError(`Compte bloqué pour 24 heures suite à de multiples tentatives échouées. 
                     Veuillez contacter votre agence ou réessayer dans ${data.remainingTime} heures.`);
          }
        } else if (response.status === 401) {
          setError(`Identifiants invalides. Tentatives restantes : ${data.remainingAttempts}`);
        } else if (response.status === 403 && data.error) {
          setError(data.error);
        } else {
          setError(data.error || 'Identifiants invalides');
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      setError('La connexion a échoué')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#1F53DD] via-[#1941B0] to-[#132F85]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          {/* Logo et En-tête */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <Landmark className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900">
              E-Bank
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Banque en ligne sécurisée
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="Nom d'utilisateur"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    placeholder="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm flex items-center text-red-500">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#1F53DD] to-[#1941B0] text-white rounded-lg hover:from-[#1941B0] hover:to-[#132F85] transition-all duration-300 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion en cours...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  Se connecter
                </div>
              )}
            </button>
            
            {/* Sign Up Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4">
                Pas encore de compte ?
              </p>
              <button
                type="button"
                onClick={onShowSignUp}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-[#1F53DD] text-[#1F53DD] font-bold rounded-lg hover:bg-[#1F53DD] hover:text-white transition-all duration-300"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Créer un compte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}