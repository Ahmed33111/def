'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { 
  ArrowRight, CreditCard, DollarSign, X, User, Settings, LogOut, Home, Wallet, History, Send, TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon, 
  ArrowUpRight, ArrowDownRight, Download, HelpCircle, Clock, Bell, Calendar, ChevronDown, Tag, FileText, ArrowDownLeft, Receipt, Zap, 
  Droplets, Wifi, Phone, Car, Search, Mail, MapPin, Shield, AlertCircle, CheckCircle, Lock, Key, Save, Coins, Banknote, CircleDollarSign, WalletCards, XCircle,
  Filter, ArrowUp, ArrowDown, Upload, Folder, Eye, Monitor, Globe, Trash2
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { apiUrl } from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface Account {
  id: number
  accountNumber: string
  balance: number
  currency: string
  status: string
  user: { fullName: string }
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  riskScore?: number;
  riskLevel?: string;
  needsReview?: boolean;
}

interface TransferFormData {
  fromAccountId: number;
  toAccountNumber: string;
  amount: number;
  password: string;
  beneficiaryName: string;
  isScheduled: boolean;
  scheduledDate: string;
  scheduledTime: string;
}

interface VirementProgramme {
  id: number;
  compteSource: Account;
  numeroCompteDestination: string;
  beneficiaireName: string;
  montant: number;
  dateExecution: string;
  executed: boolean;
  status: 'EN_ATTENTE' | 'EXECUTE' | 'REFUSE';
  refusReason?: string;
}

interface BankCard {
  id: number;
  cardNumber: string;
  cardType: 'VISA' | 'MASTERCARD';
  expirationDate: string;
  cvv: string;
  cardSubType: string;
  blocked: boolean;
  contactlessEnabled: boolean;
  onlinePaymentEnabled: boolean;
  internationalEnabled: boolean;
  dailyWithdrawalLimit: number;
  dailyPaymentLimit: number;
  prepaidBalance: number;
  holderName: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 2
  }).format(amount);
};

interface AppNotification {
  type: string;
  message: string;
  details: string;
  show: boolean;
  id: number;
}

const showNotification = (setter: React.Dispatch<React.SetStateAction<AppNotification[]>>, type: string, message: string, details: string = '') => {
  const newNotification: AppNotification = {
    type,
    message,
    details,
    show: true,
    id: Date.now()
  };
  setter(prev => [...prev, newNotification]);
  setTimeout(() => {
    setter(prev => prev.filter(n => n.id !== newNotification.id));
  }, 5000);
};

interface AccountComponentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

export default function AccountComponent({ activeTab, setActiveTab, onLogout }: AccountComponentProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [formData, setFormData] = useState<TransferFormData>({
    fromAccountId: 0,
    toAccountNumber: '',
    amount: 0,
    password: '',
    beneficiaryName: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  })
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0
  })
  const [virementsProgrammes, setVirementsProgrammes] = useState<VirementProgramme[]>([])
  const [cards, setCards] = useState<BankCard[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  // Document state
  const [docYear, setDocYear] = useState(new Date().getFullYear())
  const [docMonth, setDocMonth] = useState(new Date().getMonth() + 1)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [uploadDocType, setUploadDocType] = useState('KYC')
  const [uploadDescription, setUploadDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([])
  const [lastClassification, setLastClassification] = useState<any>(null)
  const [lastDocId, setLastDocId] = useState<number | null>(null)
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null)
  const [docPreviewDoc, setDocPreviewDoc] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCard, setSelectedCard] = useState<BankCard | null>(null)
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [cardSettingsTab, setCardSettingsTab] = useState<'security' | 'limits' | 'topup'>('security')
  const [cardLimitsForm, setCardLimitsForm] = useState({ withdrawal: '', payment: '' })
  const [cardTopupForm, setCardTopupForm] = useState({ amount: '', password: '' })
  const [isCardActionLoading, setIsCardActionLoading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [dashboardStats, setDashboardStats] = useState<any>(null)

  // Animated counter hook for KPIs
  const useAnimatedCounter = (target: number, duration: number = 1200) => {
    const [count, setCount] = useState(0)
    useEffect(() => {
      if (target === 0) { setCount(0); return }
      let startTime: number | null = null
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
        setCount(Math.floor(eased * target))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, [target, duration])
    return count
  }

  const animatedBalance = useAnimatedCounter(accounts.reduce((sum, acc) => sum + acc.balance, 0))
  const animatedIncome = useAnimatedCounter(stats.totalIncome || 0)
  const animatedExpenses = useAnimatedCounter(stats.totalExpenses || 0)
  const animatedTransactions = useAnimatedCounter(stats.totalTransactions || transactions.length)

  const handleAuthFailure = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      onLogout?.();
      return true;
    }
    return false;
  };

  const fetchAccounts = useCallback(async (): Promise<Account[]> => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl('/api/accounts'), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return []
      }
      const data = await response.json()
      setAccounts(data)
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0])
        setFormData(prev => ({ ...prev, fromAccountId: data[0].id }))
      }
      return data
    } catch (error) {
      console.error('Error fetching accounts:', error)
      return []
    }
  }, [selectedAccount])

  const fetchTransactions = useCallback(async (accountId?: number) => {
    try {
      const credentials = localStorage.getItem('credentials')
      const url = accountId 
        ? apiUrl(`/api/accounts/${accountId}/transactions`)
        : apiUrl('/api/accounts/transactions/all')

      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return
      }
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl('/api/accounts/statistics'), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  const fetchDashboardStats = useCallback(async () => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl('/api/stats/dashboard?period=month'), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) return
      const data = await response.json()
      setDashboardStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }, [])

  const fetchVirementsProgrammes = useCallback(async () => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl('/api/accounts/transfers/programmes'), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return
      }
      if (response.ok) {
        const data = await response.json()
        setVirementsProgrammes(data)
      }
    } catch (error) {
      console.error('Error fetching scheduled transfers:', error)
    }
  }, [])

  const fetchCards = useCallback(async (accountId: number) => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/accounts/${accountId}/cards`), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return
      }
      if (response.ok) {
      const data = await response.json()
      setCards(Array.isArray(data) ? data : [])
    } else {
      setCards([])
    }
    } catch (error) {
      console.error('Error fetching cards:', error)
    }
  }, [])

  const fetchUploadedDocs = useCallback(async () => {
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl('/api/documents/my'), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (handleAuthFailure(response)) {
        return
      }
      if (response.ok) {
        const data = await response.json()
        setUploadedDocs(data)
      }
    } catch (error) {
      console.error('Error fetching uploaded docs:', error)
    }
  }, [])

  const handleDownloadStatement = async () => {
    if (!selectedAccount) {
      showNotification(setNotifications, 'error', 'Veuillez sélectionner un compte')
      return
    }
    setIsDownloading('statement')
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(
        apiUrl(`/api/accounts/documents/statement?accountId=${selectedAccount.id}&year=${docYear}&month=${docMonth}`),
        { headers: { 'Authorization': `Basic ${credentials}` }, credentials: 'include' }
      )
      if (!response.ok) throw new Error('Erreur lors du téléchargement')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = response.headers.get('content-disposition')
      const fname = cd ? cd.split('filename="')[1]?.replace('"', '') : `releve_${docMonth}_${docYear}.pdf`
      a.download = fname || `releve_${docMonth}_${docYear}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showNotification(setNotifications, 'success', 'Relevé téléchargé avec succès')
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur lors du téléchargement')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!selectedAccount) {
      showNotification(setNotifications, 'error', 'Veuillez sélectionner un compte')
      return
    }
    setIsDownloading('certificate')
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(
        apiUrl(`/api/accounts/documents/certificate?accountId=${selectedAccount.id}`),
        { headers: { 'Authorization': `Basic ${credentials}` }, credentials: 'include' }
      )
      if (!response.ok) throw new Error('Erreur lors du téléchargement')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = response.headers.get('content-disposition')
      const fname = cd ? cd.split('filename="')[1]?.replace('"', '') : `certificat_solde.pdf`
      a.download = fname || `certificat_solde.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showNotification(setNotifications, 'success', 'Certificat téléchargé avec succès')
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur lors du téléchargement')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadFiscal = async () => {
    if (!selectedAccount) {
      showNotification(setNotifications, 'error', 'Veuillez sélectionner un compte')
      return
    }
    setIsDownloading('fiscal')
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(
        apiUrl(`/api/accounts/documents/fiscal?accountId=${selectedAccount.id}&year=${docYear}`),
        { headers: { 'Authorization': `Basic ${credentials}` }, credentials: 'include' }
      )
      if (!response.ok) throw new Error('Erreur lors du téléchargement')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = response.headers.get('content-disposition')
      const fname = cd ? cd.split('filename="')[1]?.replace('"', '') : `historique_fiscal_${docYear}.pdf`
      a.download = fname || `historique_fiscal_${docYear}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showNotification(setNotifications, 'success', 'Historique fiscal téléchargé avec succès')
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur lors du téléchargement')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setLastClassification(null)
    setLastDocId(null)
    try {
      const credentials = localStorage.getItem('credentials')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', uploadDocType)
      if (uploadDescription) formData.append('description', uploadDescription)
      const response = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include',
        body: formData
      })
      const data = await response.json()
      if (response.ok) {
        showNotification(setNotifications, 'success', 'Document téléversé avec succès', data.fileName || data.originalName)
        if (data.documentId) setLastDocId(data.documentId)
        if (data.classification) {
          setLastClassification(data.classification)
        } else {
          setLastClassification(null)
        }
        fetchUploadedDocs()
        setUploadDescription('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        showNotification(setNotifications, 'error', data.error || 'Erreur lors du téléversement')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur lors du téléversement')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAcceptClassification = async () => {
    if (!lastDocId) return
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/documents/${lastDocId}/accept-classification`), {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (response.ok) {
        showNotification(setNotifications, 'success', 'Type détecté accepté')
        setLastClassification(null)
        setLastDocId(null)
        fetchUploadedDocs()
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    }
  }

  const handleChangeClassification = async (newType: string) => {
    if (!lastDocId) return
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/documents/${lastDocId}/change-type`), {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ documentType: newType })
      })
      if (response.ok) {
        showNotification(setNotifications, 'success', 'Type de document modifié')
        setLastClassification(null)
        setLastDocId(null)
        fetchUploadedDocs()
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    }
  }

  const loadDocPreview = async (doc: any) => {
    try {
      const credentials = localStorage.getItem('credentials')
      const r = await fetch(apiUrl(`/api/documents/${doc.documentId}/file`), {
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        setDocPreviewUrl(url)
        setDocPreviewDoc(doc)
      }
    } catch {}
  }

  const closeDocPreview = () => {
    if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl)
    setDocPreviewUrl(null)
    setDocPreviewDoc(null)
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return
    setDeletingDocId(docId)
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/documents/${docId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${credentials}` },
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        showNotification(setNotifications, 'success', 'Document supprimé avec succès')
        fetchUploadedDocs()
      } else {
        showNotification(setNotifications, 'error', data.error || 'Erreur lors de la suppression')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur lors de la suppression')
    } finally {
      setDeletingDocId(null)
    }
  }

  const handleCardSecurityToggle = async (cardId: number, field: string, value: boolean) => {
    setIsCardActionLoading(true)
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/accounts/cards/${cardId}/security`), {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value })
      })
      if (response.ok) {
        const updated = await response.json()
        setSelectedCard(updated)
        setCards(prev => prev.map(c => c.id === cardId ? updated : c))
        showNotification(setNotifications, 'success', 'Paramètres de sécurité mis à jour')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    } finally {
      setIsCardActionLoading(false)
    }
  }

  const handleCardOpposition = async (cardId: number, block: boolean) => {
    setIsCardActionLoading(true)
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/accounts/cards/${cardId}/opposition`), {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ blocked: block })
      })
      if (response.ok) {
        const updated = await response.json()
        setSelectedCard(updated)
        setCards(prev => prev.map(c => c.id === cardId ? updated : c))
        showNotification(setNotifications, 'success', block ? 'Carte bloquée avec succès' : 'Carte débloquée avec succès')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    } finally {
      setIsCardActionLoading(false)
    }
  }

  const handleCardLimits = async (cardId: number) => {
    setIsCardActionLoading(true)
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/accounts/cards/${cardId}/limits`), {
        method: 'PUT',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dailyWithdrawalLimit: cardLimitsForm.withdrawal,
          dailyPaymentLimit: cardLimitsForm.payment
        })
      })
      const data = await response.json()
      if (response.ok) {
        setSelectedCard(data)
        setCards(prev => prev.map(c => c.id === cardId ? data : c))
        showNotification(setNotifications, 'success', 'Plafonds modifiés avec succès')
      } else {
        showNotification(setNotifications, 'error', data.error || 'Erreur')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    } finally {
      setIsCardActionLoading(false)
    }
  }

  const handleCardTopup = async (cardId: number) => {
    setIsCardActionLoading(true)
    try {
      const credentials = localStorage.getItem('credentials')
      const response = await fetch(apiUrl(`/api/accounts/cards/${cardId}/topup`), {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: cardTopupForm.amount,
          password: cardTopupForm.password
        })
      })
      const data = await response.json()
      if (response.ok) {
        setSelectedCard(data)
        setCards(prev => prev.map(c => c.id === cardId ? data : c))
        showNotification(setNotifications, 'success', 'Rechargement effectué avec succès')
        setCardTopupForm({ amount: '', password: '' })
        fetchAccounts()
      } else {
        showNotification(setNotifications, 'error', data.error || 'Erreur')
      }
    } catch (e: any) {
      showNotification(setNotifications, 'error', e.message || 'Erreur')
    } finally {
      setIsCardActionLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
    fetchStats()
    fetchDashboardStats()
    fetchTransactions()
    fetchVirementsProgrammes()
    fetchUploadedDocs()
  }, [fetchAccounts, fetchStats, fetchDashboardStats, fetchTransactions, fetchVirementsProgrammes, fetchUploadedDocs])

  useEffect(() => {
    if (selectedAccount) {
      fetchCards(selectedAccount.id)
    }
  }, [selectedAccount, fetchCards])

  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach(account => {
        fetchCards(account.id)
      })
    }
  }, [accounts])

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) {
      showNotification(setNotifications, 'error', 'Veuillez sélectionner un compte')
      return
    }
    setIsLoading(true)
    try {
      const credentials = localStorage.getItem('credentials')
      const transferPayload = {
        fromAccountId: selectedAccount.id,
        toAccountNumber: formData.toAccountNumber,
        amount: formData.amount,
        password: formData.password,
        beneficiaryName: formData.beneficiaryName,
        ...(formData.isScheduled ? {
        scheduledDateTime: `${formData.scheduledDate}T${formData.scheduledTime}:00`
      } : {})
      }
      const endpoint = formData.isScheduled 
        ? apiUrl('/api/accounts/transfer/programme') 
        : apiUrl('/api/accounts/transfer')
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(transferPayload)
      })
      let data
      if (response.ok) {
        data = await response.json()
      } else {
        try {
          data = await response.json()
        } catch {
          data = { error: 'Erreur inconnue' }
        }
      }
      if (response.ok) {
        showNotification(
          setNotifications, 
          'success',
          formData.isScheduled ? 'Virement programmé avec succès' : 'Virement effectué avec succès',
          `Montant: ${formatCurrency(formData.amount)}`
        )
        const updatedAccounts = await fetchAccounts()
        setAccounts(updatedAccounts)
        setShowTransferForm(false)
        resetTransferForm()
        if (formData.isScheduled) {
          fetchVirementsProgrammes()
        }
      } else {
        showNotification(
          setNotifications, 
          'error', 
          data.error || 'Le transfert a échoué',
          'Veuillez vérifier les informations saisies et réessayer.'
        )
      }
    } catch (err) {
      const error = err as Error
      showNotification(setNotifications, 'error', error.message || 'Le transfert a échoué')
    } finally {
      setIsLoading(false)
    }
  }

  const resetTransferForm = () => {
    setFormData({
      fromAccountId: 0,
      toAccountNumber: '',
      amount: 0,
      password: '',
      beneficiaryName: '',
      isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  })
  }

  const lineChartData = useMemo(() => {
    const labels = [];
    const dates: Date[] = [];
    const balanceData: number[] = new Array(7).fill(0);
    const date = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      dates.push(d);
      labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    }

    // Current total balance across all accounts
    let runningBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    balanceData[6] = runningBalance;

    // Sort transactions by date descending
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Go backward from day 6 to day 1 to calculate historical balances
    for (let i = 6; i > 0; i--) {
      const dayStart = new Date(dates[i]);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dates[i]);
      dayEnd.setHours(23, 59, 59, 999);

      // Find all transactions that occurred on Day i (between dayStart and dayEnd)
      const dayTx = sortedTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dayStart && txDate <= dayEnd;
      });

      // Undo these transactions to get the balance at the end of Day i-1
      dayTx.forEach(t => {
        const amt = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        if (t.type === 'CREDIT' || t.type === 'DEPOSIT') {
          runningBalance -= amt;
        } else if (t.type === 'DEBIT' || t.type === 'WITHDRAW' || t.type === 'BILL_PAYMENT') {
          runningBalance += amt;
        }
      });

      balanceData[i - 1] = runningBalance;
    }

    return {
      labels,
      datasets: [
        {
          label: 'Solde',
          data: balanceData,
          borderColor: '#1A45BA',
          backgroundColor: 'rgba(26, 69, 186, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1A45BA',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  }, [accounts, transactions])

  const pieChartData = useMemo(() => {
    const categories = {
      'Alimentation': 0,
      'Transport': 0,
      'Loisirs': 0,
      'Santé': 0,
      'Shopping': 0,
      'Factures': 0,
      'Autres': 0
    }

    transactions.forEach(t => {
      const isExpense = t.type === 'DEBIT' || t.type === 'WITHDRAW' || t.type === 'BILL_PAYMENT';
      if (isExpense) {
        const amt = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        const desc = (t.description || '').toLowerCase();
        
        if (desc.includes('food') || desc.includes('aliment') || desc.includes('restau') || desc.includes('supermar')) {
          categories['Alimentation'] += amt;
        } else if (desc.includes('trans') || desc.includes('car') || desc.includes('essence') || desc.includes('taxi') || desc.includes('peage')) {
          categories['Transport'] += amt;
        } else if (desc.includes('leisure') || desc.includes('loisir') || desc.includes('cinema') || desc.includes('cafe') || desc.includes('sport')) {
          categories['Loisirs'] += amt;
        } else if (desc.includes('health') || desc.includes('santé') || desc.includes('pharmacie') || desc.includes('medecin') || desc.includes('clinique')) {
          categories['Santé'] += amt;
        } else if (desc.includes('shop') || desc.includes('achat') || desc.includes('vetement') || desc.includes('cadeau')) {
          categories['Shopping'] += amt;
        } else if (t.type === 'BILL_PAYMENT' || desc.includes('facture') || desc.includes('bill') || desc.includes('steg') || desc.includes('sonede') || desc.includes('telecom')) {
          categories['Factures'] += amt;
        } else {
          categories['Autres'] += amt;
        }
      }
    })

    const labels = (Object.keys(categories) as Array<keyof typeof categories>).filter(k => categories[k] > 0)
    const data = labels.map(k => categories[k])
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#94A3B8']

    if (labels.length === 0) {
      return {
        labels: ['Aucune dépense'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#E2E8F0'],
            borderWidth: 0
          }
        ]
      }
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
          hoverOffset: 8
        }
      ]
    }
  }, [transactions])

  const barChartData = useMemo(() => {
    const labels = [];
    const creditData = [];
    const debitData = [];
    const date = new Date();

    const months: { year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const monthlyCredits = new Array(12).fill(0);
    const monthlyDebits = new Array(12).fill(0);

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      const idx = months.findIndex(m => m.year === txYear && m.month === txMonth);
      if (idx !== -1) {
        const amt = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        if (t.type === 'CREDIT' || t.type === 'DEPOSIT') {
          monthlyCredits[idx] += amt;
        } else if (t.type === 'DEBIT' || t.type === 'WITHDRAW' || t.type === 'BILL_PAYMENT') {
          monthlyDebits[idx] += amt;
        }
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Crédits',
          data: monthlyCredits,
          backgroundColor: '#10B981',
          borderRadius: 6
        },
        {
          label: 'Débits',
          data: monthlyDebits,
          backgroundColor: '#EF4444',
          borderRadius: 6
        }
      ]
    }
  }, [transactions])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
                <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de vos finances</p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="week">Cette Semaine</option>
                  <option value="month">Ce Mois</option>
                  <option value="quarter">Ce Trimestre</option>
                  <option value="year">Cette Année</option>
                </select>
              </div>
            </div>
            
            {/* KPI Cards - Clean & Professional */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Solde</span>
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Solde Total</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(animatedBalance)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">{accounts.length} compte{accounts.length > 1 ? 's' : ''} actif</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">Revenus</span>
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Revenu Total</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(animatedIncome)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Crédits cumulés</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">Dépenses</span>
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Dépenses</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(animatedExpenses)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-red-600 font-medium" title="Somme des RETRAITS et DÉBITS (virements sortants, paiements). Augmentez via retraits ou virements émis.">
                    Débits cumulés — retraits + débits
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Activité</span>
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Transactions</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{animatedTransactions}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">Opérations totales</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  <span>Évolution du Solde</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">7 derniers jours</span>
                </h3>
                <div className="h-52">
                  <Line 
                    data={lineChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6, displayColors: false } },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', callback: (value) => value + ' TND' } }
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  <span>Répartition</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Dépenses</span>
                </h3>
                <div className="h-52">
                  <Pie 
                    data={pieChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#64748b', boxWidth: 10, padding: 8 } },
                        tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6 }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Bar Chart + Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  <span>Activité Mensuelle</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">12 mois</span>
                </h3>
                <div className="h-52">
                  <Bar 
                    data={barChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top', labels: { font: { size: 10 }, color: '#64748b', boxWidth: 10 } }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6 } },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8', callback: (value) => value + ' TND' } }
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Dernières Transactions</h3>
                  <Shield size={12} className="text-gray-400" />
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {transactions.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Aucune transaction</p>
                  ) : transactions.slice(0, 8).map(t => (
                    <div key={t.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                      t.needsReview ? 'bg-red-50 border border-red-100' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'CREDIT' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{t.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('fr-FR')}</span>
                            {t.riskScore !== undefined && t.riskScore !== null && (
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                                t.riskScore < 30 ? 'bg-green-100 text-green-700' : t.riskScore <= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {t.riskScore < 30 ? 'Normal' : t.riskScore <= 70 ? 'Moyen' : 'Élevé'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className={`font-semibold text-xs ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Heatmap */}
            {dashboardStats?.heatmap && Array.isArray(dashboardStats.heatmap) && dashboardStats.heatmap.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Heatmap d'Activité</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Activité par jour/heure</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-1 text-left text-gray-500"></th>
                        {Array.from(new Set(dashboardStats.heatmap.map((d: any) => d.hour))).map((h) => (
                          <th key={String(h)} className="p-1 text-center text-gray-500 font-normal">{String(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => (
                        <tr key={day}>
                          <td className="p-1 text-gray-500 font-medium">{day.slice(0, 3)}</td>
                          {Array.from(new Set(dashboardStats.heatmap.map((d: any) => d.hour))).map((hour) => {
                            const h = String(hour);
                            const cell = dashboardStats.heatmap.find((d: any) => d.day === day && d.hour === h);
                            const val = cell?.value ?? 0;
                            const maxVal = Math.max(...dashboardStats.heatmap.map((d: any) => d.value), 1);
                            const intensity = val / maxVal;
                            return (
                              <td key={h} className="p-0.5">
                                <div className="w-full h-6 rounded-sm transition-all duration-300 hover:scale-110" style={{ backgroundColor: `rgba(59, 130, 246, ${0.05 + intensity * 0.9})` }} title={`${day} ${h}: ${val} transactions`} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <span className="text-[10px] text-gray-500">Moins</span>
                  {[0.2, 0.4, 0.6, 0.8, 1].map((opacity, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }} />
                  ))}
                  <span className="text-[10px] text-gray-500">Plus</span>
                </div>
              </div>
            )}
          </div>
        )

      case 'accounts':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Mes Comptes</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map(account => (
                <div 
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={`bg-white p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${selectedAccount?.id === account.id ? 'border-blue-500 shadow-md' : 'border-gray-100'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${account.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {account.status}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">{account.user?.fullName ?? "Client"}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{account.accountNumber}</p>
                  <p className="text-xl font-bold text-gray-900 mt-3">{formatCurrency(account.balance)}</p>
                </div>
              ))}
            </div>

            {selectedAccount && (
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-800">Cartes Bancaires</h3>
                  <button 
                    onClick={() => setShowCardModal(true)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CreditCard size={16} /> Nouvelle Carte
                  </button>
                </div>
                
                {cards.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucune carte bancaire associée à ce compte</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cards.map(card => (
                      <div key={card.id} className={`border rounded-xl overflow-hidden ${card.blocked ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                        {/* Card Visual */}
                        <div className={`p-5 ${card.blocked ? 'bg-gradient-to-br from-gray-600 to-gray-700' : 'bg-gradient-to-br from-gray-800 to-gray-900'}`}>
                          <div className="flex items-center justify-between mb-6">
                            <div className="text-xl font-bold text-blue-400">{card.cardType}</div>
                            <div className="flex items-center gap-2">
                              {card.blocked && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">BLOQUÉE</span>}
                              <span className="px-2 py-0.5 bg-white/10 text-white/80 text-[10px] rounded-full font-medium">{card.cardSubType}</span>
                              <CreditCard className="w-6 h-6 text-white/60" />
                            </div>
                          </div>
                          <p className="text-lg font-mono tracking-widest text-white mb-4">{card.cardNumber}</p>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase">Titulaire</p>
                              <p className="text-sm font-semibold text-white">{card.holderName || selectedAccount.user?.fullName || "Client"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 uppercase">Expire</p>
                              <p className="text-sm font-semibold text-white">{card.expirationDate}</p>
                            </div>
                          </div>
                        </div>
                        {/* Card Actions */}
                        <div className="p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-600">Paramètres de la carte</span>
                            <button
                              onClick={() => { setSelectedCard(card); setShowCardSettings(true); setCardSettingsTab('security'); setCardLimitsForm({ withdrawal: String(card.dailyWithdrawalLimit || 1000), payment: String(card.dailyPaymentLimit || 5000) }); }}
                              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
                            >
                              <Settings size={12} /> Gérer
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Wifi size={14} className={card.contactlessEnabled ? 'text-green-500' : 'text-gray-400'} />
                              <div>
                                <p className="text-[10px] text-gray-500">Sans contact</p>
                                <p className={`text-[11px] font-semibold ${card.contactlessEnabled ? 'text-green-600' : 'text-gray-400'}`}>{card.contactlessEnabled ? 'Actif' : 'Inactif'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Monitor size={14} className={card.onlinePaymentEnabled ? 'text-green-500' : 'text-gray-400'} />
                              <div>
                                <p className="text-[10px] text-gray-500">Internet</p>
                                <p className={`text-[11px] font-semibold ${card.onlinePaymentEnabled ? 'text-green-600' : 'text-gray-400'}`}>{card.onlinePaymentEnabled ? 'Actif' : 'Inactif'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Globe size={14} className={card.internationalEnabled ? 'text-green-500' : 'text-gray-400'} />
                              <div>
                                <p className="text-[10px] text-gray-500">International</p>
                                <p className={`text-[11px] font-semibold ${card.internationalEnabled ? 'text-green-600' : 'text-gray-400'}`}>{card.internationalEnabled ? 'Actif' : 'Inactif'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <Banknote size={14} className="text-blue-500" />
                              <div>
                                <p className="text-[10px] text-gray-500">Plafond retrait</p>
                                <p className="text-[11px] font-semibold text-gray-700">{formatCurrency(card.dailyWithdrawalLimit || 1000)}</p>
                              </div>
                            </div>
                          </div>
                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => handleCardOpposition(card.id, !card.blocked)}
                              disabled={isCardActionLoading}
                              className={`flex-1 text-xs py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                card.blocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <Lock size={12} /> {card.blocked ? 'Débloquer' : 'Bloquer'}
                            </button>
                            <button
                              onClick={() => { setSelectedCard(card); setShowCardSettings(true); setCardSettingsTab('limits'); setCardLimitsForm({ withdrawal: String(card.dailyWithdrawalLimit || 1000), payment: String(card.dailyPaymentLimit || 5000) }); }}
                              className="flex-1 text-xs py-2 px-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Settings size={12} /> Plafonds
                            </button>
                            <button
                              onClick={() => { setSelectedCard(card); setShowCardSettings(true); setCardSettingsTab('topup'); setCardTopupForm({ amount: '', password: '' }); }}
                              className="flex-1 text-xs py-2 px-3 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Coins size={12} /> Recharger
                            </button>
                          </div>
                          {(card.cardSubType === 'MYCARD' || card.cardSubType === 'PREPAID' || card.cardSubType === 'DEVISES') && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                              <span className="text-[10px] text-blue-600 font-medium">Solde prépayé</span>
                              <span className="text-xs font-bold text-blue-700">{formatCurrency(card.prepaidBalance || 0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'transfers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-800">Virements</h1>
              <button 
                onClick={() => setShowTransferForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Send size={20} /> Nouveau Virement
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Virements Programmés</h3>
              {virementsProgrammes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun virement programmé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {virementsProgrammes.map(v => (
                    <div key={v.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{v.beneficiaireName}</p>
                        <p className="text-sm text-gray-500">{v.numeroCompteDestination}</p>
                        <p className="text-xs text-gray-400">{new Date(v.dateExecution).toLocaleString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(v.montant)}</p>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold inline-block mt-1 ${
                          v.status === 'EXECUTE' ? 'bg-green-100 text-green-700' : 
                          v.status === 'REFUSE' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {v.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'documents':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Documents</h1>

            {/* Account selector for downloads */}
            {accounts.length > 0 && (
              <div className="bg-white p-4 rounded-2xl shadow border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Compte sélectionné pour les téléchargements</label>
                <select
                  value={selectedAccount?.id || ''}
                  onChange={e => {
                    const acc = accounts.find(a => a.id === parseInt(e.target.value))
                    if (acc) setSelectedAccount(acc)
                  }}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountNumber} - {a.user?.fullName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ---- DOWNLOAD SECTION ---- */}
            <h2 className="text-xl font-semibold text-gray-700">Télécharger des Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Relevé Mensuel */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <FileText className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Relevé Mensuel</h3>
                <p className="text-gray-500 text-sm mb-4">Relevé de compte mensuel au format PDF</p>
                <div className="flex gap-2 mb-4">
                  <select
                    value={docMonth}
                    onChange={e => setDocMonth(parseInt(e.target.value))}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg"
                  >
                    {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={docYear}
                    onChange={e => setDocYear(parseInt(e.target.value))}
                    min={2020}
                    max={new Date().getFullYear()}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <button
                  onClick={handleDownloadStatement}
                  disabled={isDownloading === 'statement'}
                  className="w-full text-blue-600 font-semibold flex items-center justify-center gap-2 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <Download size={16} />
                  {isDownloading === 'statement' ? 'Téléchargement...' : 'Télécharger PDF'}
                </button>
              </div>

              {/* Certificat de Solde */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <Receipt className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Certificat de Solde</h3>
                <p className="text-gray-500 text-sm mb-4">Attestation officielle du solde du compte</p>
                <p className="text-xs text-gray-400 mb-4">Valide 30 jours à partir d'aujourd'hui</p>
                <button
                  onClick={handleDownloadCertificate}
                  disabled={isDownloading === 'certificate'}
                  className="w-full text-green-600 font-semibold flex items-center justify-center gap-2 py-2 border border-green-200 rounded-lg hover:bg-green-50 transition disabled:opacity-50"
                >
                  <Download size={16} />
                  {isDownloading === 'certificate' ? 'Téléchargement...' : 'Télécharger PDF'}
                </button>
              </div>

              {/* Historique Fiscal */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <Calendar className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Historique Fiscal</h3>
                <p className="text-gray-500 text-sm mb-4">Récapitulatif annuel pour la déclaration fiscale</p>
                <div className="mb-4">
                  <input
                    type="number"
                    value={docYear}
                    onChange={e => setDocYear(parseInt(e.target.value))}
                    min={2020}
                    max={new Date().getFullYear()}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
                    placeholder="Année"
                  />
                </div>
                <button
                  onClick={handleDownloadFiscal}
                  disabled={isDownloading === 'fiscal'}
                  className="w-full text-purple-600 font-semibold flex items-center justify-center gap-2 py-2 border border-purple-200 rounded-lg hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <Download size={16} />
                  {isDownloading === 'fiscal' ? 'Téléchargement...' : 'Télécharger PDF'}
                </button>
              </div>
            </div>

            {/* ---- UPLOAD SECTION ---- */}
            <h2 className="text-xl font-semibold text-gray-700 mt-8">Déposer vos Documents Personnels</h2>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <p className="text-sm text-gray-500 mb-6">Téléversez vos documents personnels (KYC, justificatif de dépôt, gestion de compte, demande de crédit). Formats acceptés : PDF, JPG, PNG (max 10 Mo).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
                    <select
                      value={uploadDocType}
                      onChange={e => setUploadDocType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="KYC">KYC - Ouverture de compte (CIN, passeport...)</option>
                      <option value="DEPOSIT_PROOF">Justificatif de dépôt physique</option>
                      <option value="ACCOUNT_MANAGEMENT">Gestion de compte</option>
                      <option value="CREDIT_REQUEST">Demande de crédit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
                    <input
                      type="text"
                      value={uploadDescription}
                      onChange={e => setUploadDescription(e.target.value)}
                      placeholder="Ex: Carte d'identité recto-verso"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Téléversement en cours...</span>
                    </div>
                  )}
                  {/* ML Classification Result */}
                  {lastClassification && (
                    <div className="rounded-2xl border-2 overflow-hidden shadow-lg animate-pulse-once" style={{
                      borderColor: lastClassification.confidence > 70 ? '#86efac' :
                                   lastClassification.confidence >= 40 ? '#fde68a' : '#fca5a5',
                      background: lastClassification.confidence > 70 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' :
                                  lastClassification.confidence >= 40 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' :
                                  lastClassification.confidence > 0 ? 'linear-gradient(135deg, #fff1f2, #ffe4e6)' :
                                  'linear-gradient(135deg, #f8fafc, #f1f5f9)'
                    }}>
                      {/* Header */}
                      <div className="px-5 py-3 flex items-center justify-between" style={{
                        background: lastClassification.confidence > 70 ? 'rgba(34,197,94,0.1)' :
                                    lastClassification.confidence >= 40 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)'
                      }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{
                            background: lastClassification.confidence > 70 ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                                        lastClassification.confidence >= 40 ? 'linear-gradient(135deg, #eab308, #ca8a04)' :
                                        'linear-gradient(135deg, #ef4444, #dc2626)'
                          }}>
                            🤖
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Analyse IA</p>
                            <p className="text-sm font-semibold text-gray-800">Classification automatique</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          lastClassification.confidence > 70 ? 'bg-green-600 text-white' :
                          lastClassification.confidence >= 40 ? 'bg-yellow-500 text-white' :
                          lastClassification.confidence > 0 ? 'bg-red-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {lastClassification.confidence > 70 ? '✅ Haute' : lastClassification.confidence >= 40 ? '⚡ Moyenne' : lastClassification.confidence > 0 ? '⚠️ Faible' : '— N/A'}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="p-5 space-y-4">
                        {lastClassification.confidence > 0 ? (
                          <>
                            {/* Type detected + Confidence bar */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Type détecté</span>
                                <span className="text-lg font-bold text-gray-900">{lastClassification.confidence}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                      width: `${lastClassification.confidence}%`,
                                      background: lastClassification.confidence > 70 ? 'linear-gradient(90deg, #22c55e, #16a34a)' :
                                                  lastClassification.confidence >= 40 ? 'linear-gradient(90deg, #eab308, #ca8a04)' :
                                                  'linear-gradient(90deg, #ef4444, #dc2626)'
                                    }}
                                  />
                                </div>
                                <span className="text-xl">
                                  {lastClassification.type === 'CIN' ? '🪪' :
                                   lastClassification.type === 'KYC' ? '📋' :
                                   lastClassification.type === 'PASSPORT' ? '🛂' :
                                   lastClassification.type === 'PROOF_OF_ADDRESS' ? '🏠' :
                                   lastClassification.type === 'DEPOSIT_PROOF' ? '💰' :
                                   lastClassification.type === 'ACCOUNT_MANAGEMENT' ? '📊' :
                                   lastClassification.type === 'CREDIT_REQUEST' ? '🏦' : '📄'}
                                </span>
                              </div>
                              <p className="mt-1.5 text-base font-bold text-gray-900">
                                {lastClassification.type === 'CIN' ? 'Carte d\u2019identité nationale' :
                                 lastClassification.type === 'KYC' ? 'Document KYC (Identité)' :
                                 lastClassification.type === 'PASSPORT' ? 'Passeport' :
                                 lastClassification.type === 'PROOF_OF_ADDRESS' ? 'Justificatif de domicile' :
                                 lastClassification.type === 'DEPOSIT_PROOF' ? 'Justificatif de dépôt' :
                                 lastClassification.type === 'ACCOUNT_MANAGEMENT' ? 'Gestion de compte' :
                                 lastClassification.type === 'CREDIT_REQUEST' ? 'Demande de crédit' :
                                 lastClassification.type}
                              </p>
                            </div>

                            {/* Matched Keywords */}
                            {lastClassification.matchedKeywords?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mots-clés détectés</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {lastClassification.matchedKeywords.map((kw: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-xs text-gray-700 rounded-full shadow-sm">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60">
                              <button
                                onClick={handleAcceptClassification}
                                className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 font-semibold shadow-sm flex items-center justify-center gap-2 transition"
                              >
                                <CheckCircle size={16} /> Confirmer le type
                              </button>
                              <select
                                onChange={(e) => { if (e.target.value) handleChangeClassification(e.target.value) }}
                                value=""
                                className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                              >
                                <option value="">🔄 Changer...</option>
                                <option value="KYC">KYC</option>
                                <option value="CIN">🪪 CIN</option>
                                <option value="PASSPORT">🛂 Passeport</option>
                                <option value="PROOF_OF_ADDRESS">🏠 Justificatif adresse</option>
                                <option value="DEPOSIT_PROOF">💰 Justificatif dépôt</option>
                                <option value="ACCOUNT_MANAGEMENT">📊 Gestion compte</option>
                                <option value="CREDIT_REQUEST">🏦 Demande crédit</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-sm text-gray-500 mb-3">
                              🤖 L'IA n'a pas pu identifier le type de ce document automatiquement.
                            </p>
                            <select
                              onChange={(e) => { if (e.target.value) handleChangeClassification(e.target.value) }}
                              value=""
                              className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                              <option value="">Choisir le type manuellement...</option>
                              <option value="KYC">KYC</option>
                              <option value="CIN">🪪 CIN</option>
                              <option value="PASSPORT">🛂 Passeport</option>
                              <option value="PROOF_OF_ADDRESS">🏠 Justificatif adresse</option>
                              <option value="DEPOSIT_PROOF">💰 Justificatif dépôt</option>
                              <option value="ACCOUNT_MANAGEMENT">📊 Gestion compte</option>
                              <option value="CREDIT_REQUEST">🏦 Demande crédit</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Manual classification message when ML is offline */}
                  {lastClassification === null && lastDocId !== null && !isUploading && (
                    <div className="rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                      <div className="px-5 py-3 bg-gray-100/50">
                        <p className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs">🤖</span>
                          Service IA temporairement indisponible
                        </p>
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-gray-500 mb-3">Veuillez classifier le document manuellement</p>
                        <select
                          onChange={(e) => { if (e.target.value) handleChangeClassification(e.target.value) }}
                          value=""
                          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="">Choisir le type de document...</option>
                          <option value="KYC">KYC</option>
                          <option value="CIN">🪪 CIN</option>
                          <option value="PASSPORT">🛂 Passeport</option>
                          <option value="PROOF_OF_ADDRESS">🏠 Justificatif adresse</option>
                          <option value="DEPOSIT_PROOF">💰 Justificatif dépôt</option>
                          <option value="ACCOUNT_MANAGEMENT">📊 Gestion compte</option>
                          <option value="CREDIT_REQUEST">🏦 Demande crédit</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded docs list */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Folder size={18} className="text-gray-500" />
                    Documents déposés ({uploadedDocs.length})
                  </h4>
                  {uploadedDocs.length === 0 ? (
                    <p className="text-gray-400 text-sm">Aucun document déposé</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {uploadedDocs.map((doc: any, idx: number) => (
                        <div key={doc.documentId || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                          <FileText size={16} className="text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 truncate">{doc.fileName || doc.filename}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {doc.documentType || doc.docType}
                              </span>
                              <span className="text-xs text-gray-400">
                                {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} Ko` : doc.size ? `${(doc.size / 1024).toFixed(1)} Ko` : ''}
                              </span>
                              {doc.status && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                  doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {doc.status === 'APPROVED' ? '✅' : doc.status === 'REJECTED' ? '❌' : '⏳'} {doc.status}
                                </span>
                              )}
                              {doc.confidenceScore > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  doc.confidenceScore > 70 ? 'bg-green-100 text-green-700' :
                                  doc.confidenceScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  🤖 {doc.confidenceScore}% {doc.detectedType ? `· ${doc.detectedType}` : ''}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : ''}
                              </span>
                            </div>
                          </div>
                          {doc.documentId && (
                            <button
                              onClick={() => loadDocPreview(doc)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                              title="Voir le document"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          {doc.documentId && (
                            <button
                              onClick={() => handleDeleteDocument(doc.documentId)}
                              disabled={deletingDocId === doc.documentId}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                              title="Supprimer le document"
                            >
                              {deletingDocId === doc.documentId ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={fetchUploadedDocs}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Actualiser la liste
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div>Sélectionnez un onglet</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>

      {showTransferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouveau Virement</h2>
              <button 
                onClick={() => { setShowTransferForm(false); resetTransferForm() }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compte Source</label>
                <select
                  value={formData.fromAccountId}
                  onChange={(e) => setFormData({ ...formData, fromAccountId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.accountNumber} - {formatCurrency(account.balance)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro Compte Destinataire</label>
                <input
                  type="text"
                  required
                  value={formData.toAccountNumber}
                  onChange={(e) => setFormData({ ...formData, toAccountNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom Bénéficiaire</label>
                <input
                  type="text"
                  required
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (TND)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="scheduled"
                  checked={formData.isScheduled}
                  onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="scheduled" className="text-sm font-medium text-gray-700">Programmer le virement</label>
              </div>

              {formData.isScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.scheduledDate || ''}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                    <input
                      type="time"
                      required
                      value={formData.scheduledTime || ''}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de Passe</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowTransferForm(false); resetTransferForm() }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {docPreviewUrl && docPreviewDoc && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                {docPreviewDoc.fileName || docPreviewDoc.filename}
              </h3>
              <button onClick={closeDocPreview} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {docPreviewDoc.mimeType?.startsWith('image/') ? (
                <img src={docPreviewUrl} alt={docPreviewDoc.fileName} className="w-full max-h-[70vh] object-contain rounded-lg bg-gray-100" />
              ) : docPreviewDoc.mimeType === 'application/pdf' ? (
                <iframe src={docPreviewUrl} className="w-full h-[70vh] rounded-lg border" title={docPreviewDoc.fileName} />
              ) : (
                <div className="p-8 bg-gray-50 rounded-lg text-center">
                  <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">Prévisualisation non disponible pour ce type de fichier</p>
                  <a
                    href={docPreviewUrl}
                    download={docPreviewDoc.fileName}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download size={16} /> Télécharger
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Settings Modal */}
      {showCardSettings && selectedCard && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={20} className="text-blue-600" />
                Gestion de la carte
              </h3>
              <button onClick={() => setShowCardSettings(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {[{ key: 'security', label: 'Sécurité', icon: <Shield size={14} /> }, { key: 'limits', label: 'Plafonds', icon: <Banknote size={14} /> }, { key: 'topup', label: 'Rechargement', icon: <Coins size={14} /> }].map(tab => (
                <button key={tab.key} onClick={() => setCardSettingsTab(tab.key as any)} className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${cardSettingsTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {cardSettingsTab === 'security' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 mb-3">Activez ou désactivez les options de sécurité de votre carte.</p>
                  {[
                    { field: 'contactlessEnabled', label: 'Paiement sans contact', desc: 'Permet le paiement NFC sans contact physique', icon: <Wifi size={18} /> },
                    { field: 'onlinePaymentEnabled', label: 'Paiement à distance (Internet)', desc: 'Autorise les achats en ligne avec votre carte', icon: <Monitor size={18} /> },
                    { field: 'internationalEnabled', label: 'Paiement à l\'étranger', desc: 'Utilisation de la carte hors du territoire national', icon: <Globe size={18} /> },
                  ].map(opt => (
                    <div key={opt.field} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-gray-600">{opt.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                          <p className="text-[11px] text-gray-500">{opt.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCardSecurityToggle(selectedCard.id, opt.field, !(selectedCard as any)[opt.field])}
                        disabled={isCardActionLoading}
                        className={`relative w-11 h-6 rounded-full transition-colors ${((selectedCard as any)[opt.field]) ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${((selectedCard as any)[opt.field]) ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedCard.blocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          <Lock size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Opposition de carte</p>
                          <p className="text-[11px] text-gray-500">{selectedCard.blocked ? 'Votre carte est actuellement bloquée' : 'Bloquer en cas de perte ou de vol'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCardOpposition(selectedCard.id, !selectedCard.blocked)}
                        disabled={isCardActionLoading}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg ${selectedCard.blocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        {selectedCard.blocked ? 'Débloquer' : 'Bloquer'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {cardSettingsTab === 'limits' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 mb-3">Modifiez vos plafonds de retrait et de paiement selon vos besoins.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Plafond de retrait journalier (TND)</label>
                    <input type="number" value={cardLimitsForm.withdrawal} onChange={e => setCardLimitsForm(p => ({ ...p, withdrawal: e.target.value }))} min={1} max={50000} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                    <p className="text-[10px] text-gray-400 mt-1">Maximum : 50 000 TND</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Plafond de paiement journalier (TND)</label>
                    <input type="number" value={cardLimitsForm.payment} onChange={e => setCardLimitsForm(p => ({ ...p, payment: e.target.value }))} min={1} max={100000} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                    <p className="text-[10px] text-gray-400 mt-1">Maximum : 100 000 TND</p>
                  </div>
                  <button onClick={() => handleCardLimits(selectedCard.id)} disabled={isCardActionLoading} className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                    {isCardActionLoading ? 'Modification...' : 'Modifier les plafonds'}
                  </button>
                </div>
              )}
              {cardSettingsTab === 'topup' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 mb-3">Rechargez votre carte prépayée (MyCard, cartes en devises).</p>
                  {(selectedCard.cardSubType !== 'MYCARD' && selectedCard.cardSubType !== 'PREPAID' && selectedCard.cardSubType !== 'DEVISES') && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      Cette carte n'est pas une carte prépayée. Le rechargement ne sera pas disponible.
                    </div>
                  )}
                  <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">Solde prépayé actuel</span>
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(selectedCard.prepaidBalance || 0)}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant à recharger (TND)</label>
                    <input type="number" value={cardTopupForm.amount} onChange={e => setCardTopupForm(p => ({ ...p, amount: e.target.value }))} min={1} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Ex: 100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                    <input type="password" value={cardTopupForm.password} onChange={e => setCardTopupForm(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Votre mot de passe" />
                  </div>
                  <button onClick={() => handleCardTopup(selectedCard.id)} disabled={isCardActionLoading || !cardTopupForm.amount || !cardTopupForm.password} className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                    {isCardActionLoading ? 'Rechargement...' : 'Recharger'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`px-6 py-4 rounded-lg shadow-lg text-white flex items-center gap-3 animate-slide-in ${
              notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
            <div>
              <p className="font-semibold">{notification.message}</p>
              {notification.details && <p className="text-sm opacity-90">{notification.details}</p>}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
