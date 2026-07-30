'use client'
import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText, CheckCircle, XCircle, Clock, BarChart2, Search,
  RefreshCw, Filter, Eye, X, ChevronDown, AlertCircle, User,
  TrendingUp, Calendar, Shield
} from 'lucide-react'
import { apiUrl } from '../api'

interface DocStats {
  totalDocuments: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  todayUploads: number
  averageConfidence: number
}

interface DocumentItem {
  documentId: number
  documentType: string
  fileName: string
  fileSize: number
  mimeType: string
  status: string
  confidenceScore: number
  detectedType: string | null
  uploadedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  reviewedBy: string | null
  clientName: string
  clientEmail: string
  clientPhone: string
  clientId: number
}

const DOC_TYPE_LABELS: Record<string, string> = {
  KYC: 'KYC',
  DEPOSIT_PROOF: 'Dépôt physique',
  ACCOUNT_MANAGEMENT: 'Gestion compte',
  CREDIT_REQUEST: 'Demande crédit',
  CIN: 'CIN',
  PASSPORT: 'Passeport',
  PROOF_OF_ADDRESS: 'Justificatif adresse',
  OTHER: 'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border border-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ En attente',
  APPROVED: '✅ Approuvé',
  REJECTED: '❌ Rejeté',
}

const confidenceBadge = (score: number) => {
  if (score >= 70) return 'bg-green-100 text-green-700 border border-green-300'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border border-yellow-300'
  return 'bg-red-100 text-red-700 border border-red-300'
}

const initials = (name: string) =>
  name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

export default function DocumentReviewDashboard() {
  const [stats, setStats] = useState<DocStats | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [filtered, setFiltered] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState<{ id: number; type: string; msg: string }[]>([])

  const notify = (type: string, msg: string) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, type, msg }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }

  const credentials = localStorage.getItem('credentials')
  const headers = { Authorization: `Basic ${credentials}` }

  const getFileUrl = (docId: number) => {
    return apiUrl(`/api/documents/${docId}/file`)
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const loadPreview = async (doc: DocumentItem) => {
    try {
      const r = await fetch(apiUrl(`/api/documents/${doc.documentId}/file`), {
        headers, credentials: 'include'
      })
      if (r.ok) {
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      }
    } catch {}
  }

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/api/cashier/documents/stats'), { headers, credentials: 'include' })
      if (r.ok) setStats(await r.json())
    } catch {}
  }, [])

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterType) params.append('documentType', filterType)
      if (filterDateFrom) params.append('dateFrom', filterDateFrom)
      if (filterDateTo) params.append('dateTo', filterDateTo)

      const url = params.toString()
        ? apiUrl(`/api/cashier/documents/filter?${params}`)
        : apiUrl('/api/cashier/documents/pending')

      const r = await fetch(url, { headers, credentials: 'include' })
      if (r.ok) {
        const data: DocumentItem[] = await r.json()
        setDocuments(data)
        applySearch(data, searchQuery)
      }
    } catch {}
    setIsLoading(false)
  }, [filterStatus, filterType, filterDateFrom, filterDateTo])

  const applySearch = (docs: DocumentItem[], q: string) => {
    if (!q.trim()) { setFiltered(docs); return }
    const lower = q.toLowerCase()
    setFiltered(docs.filter(d =>
      d.clientName?.toLowerCase().includes(lower) ||
      d.fileName?.toLowerCase().includes(lower) ||
      d.documentType?.toLowerCase().includes(lower)
    ))
  }

  useEffect(() => { fetchStats(); fetchDocuments() }, [])
  useEffect(() => { applySearch(documents, searchQuery) }, [searchQuery, documents])

  const handleApprove = async (docId: number) => {
    setIsProcessing(true)
    try {
      const r = await fetch(apiUrl(`/api/cashier/documents/${docId}/approve`), {
        method: 'POST', headers, credentials: 'include'
      })
      if (r.ok) {
        notify('success', 'Document approuvé')
        setShowModal(false)
        fetchDocuments(); fetchStats()
      } else {
        notify('error', 'Erreur lors de l\'approbation')
      }
    } catch { notify('error', 'Erreur réseau') }
    setIsProcessing(false)
  }

  const handleReject = async (docId: number) => {
    if (!rejectReason.trim()) { notify('error', 'Veuillez saisir un motif de rejet'); return }
    setIsProcessing(true)
    try {
      const r = await fetch(apiUrl(`/api/cashier/documents/${docId}/reject`), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason })
      })
      if (r.ok) {
        notify('success', 'Document rejeté')
        setShowModal(false); setRejectReason('')
        fetchDocuments(); fetchStats()
      } else {
        notify('error', 'Erreur lors du rejet')
      }
    } catch { notify('error', 'Erreur réseau') }
    setIsProcessing(false)
  }

  const resetFilters = () => {
    setFilterStatus(''); setFilterType(''); setFilterDateFrom('')
    setFilterDateTo(''); setSearchQuery('')
    setTimeout(fetchDocuments, 50)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-xl shadow-lg text-white flex items-center gap-2 animate-pulse ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {n.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{n.msg}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-blue-600" size={28} />
            Validation KYC Documents
          </h1>
          <p className="text-gray-500 text-sm mt-1">Revue et validation des documents clients</p>
        </div>
        <button
          onClick={() => { fetchDocuments(); fetchStats() }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
            {(stats?.pendingCount ?? 0) > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {stats?.pendingCount}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats?.pendingCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">📋 En attente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats?.approvedCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">✅ Approuvés</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
            <XCircle size={20} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats?.rejectedCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">❌ Rejetés</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <BarChart2 size={20} className="text-blue-600" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats?.averageConfidence ?? 0}%</p>
            <div className="mb-1 flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${stats?.averageConfidence ?? 0}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">📊 Score moyen IA</p>
          <p className="text-xs text-gray-400">{stats?.todayUploads ?? 0} upload(s) aujourd'hui</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, fichier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvés</option>
            <option value="REJECTED">Rejetés</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Tous les types</option>
            <option value="KYC">KYC</option>
            <option value="DEPOSIT_PROOF">Justificatif dépôt</option>
            <option value="ACCOUNT_MANAGEMENT">Gestion compte</option>
            <option value="CREDIT_REQUEST">Demande crédit</option>
          </select>

          {/* Date filters */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={fetchDocuments}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter size={14} /> Filtrer
          </button>

          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl hover:bg-gray-200"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Documents list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">
            Documents ({filtered.length})
          </h2>
          {isLoading && <span className="text-xs text-gray-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Chargement...</span>}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun document trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(doc => (
                <div key={doc.documentId} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials(doc.clientName || '')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{doc.clientName || 'Client inconnu'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </span>
                      {doc.confidenceScore > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceBadge(doc.confidenceScore)}`}>
                          🤖 {doc.confidenceScore}% · {doc.detectedType}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {doc.fileSize && (
                        <span className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(1)} Ko</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedDoc(doc); setShowModal(true); setRejectReason(''); setPreviewUrl(null); loadPreview(doc) }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Voir détails"
                    >
                      <Eye size={16} />
                    </button>
                    {doc.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(doc.documentId)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          ✅ Approuver
                        </button>
                        <button
                          onClick={() => { setSelectedDoc(doc); setShowModal(true); setRejectReason(''); setPreviewUrl(null); loadPreview(doc) }}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200 font-medium"
                        >
                          ❌ Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document detail modal */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Détails du document
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Client info */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                  {initials(selectedDoc.clientName || '')}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedDoc.clientName}</p>
                  <p className="text-xs text-gray-500">{selectedDoc.clientEmail}</p>
                  <p className="text-xs text-gray-500">{selectedDoc.clientPhone}</p>
                </div>
              </div>

              {/* Document info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400 text-xs uppercase tracking-wide">Fichier</p><p className="font-medium text-gray-700 truncate">{selectedDoc.fileName}</p></div>
                <div><p className="text-gray-400 text-xs uppercase tracking-wide">Type</p><p className="font-medium text-gray-700">{DOC_TYPE_LABELS[selectedDoc.documentType] || selectedDoc.documentType}</p></div>
                <div><p className="text-gray-400 text-xs uppercase tracking-wide">Statut</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedDoc.status]}`}>{STATUS_LABELS[selectedDoc.status]}</span>
                </div>
                <div><p className="text-gray-400 text-xs uppercase tracking-wide">Taille</p><p className="font-medium text-gray-700">{selectedDoc.fileSize ? `${(selectedDoc.fileSize / 1024).toFixed(1)} Ko` : '-'}</p></div>
                <div><p className="text-gray-400 text-xs uppercase tracking-wide">Uploadé le</p><p className="font-medium text-gray-700">{selectedDoc.uploadedAt ? new Date(selectedDoc.uploadedAt).toLocaleString('fr-FR') : '-'}</p></div>
                {selectedDoc.reviewedBy && (
                  <div><p className="text-gray-400 text-xs uppercase tracking-wide">Révisé par</p><p className="font-medium text-gray-700">{selectedDoc.reviewedBy}</p></div>
                )}
              </div>

              {/* Document Preview */}
              {previewUrl && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {selectedDoc.mimeType?.startsWith('image/') ? (
                    <img src={previewUrl} alt={selectedDoc.fileName} className="w-full max-h-96 object-contain bg-gray-100" />
                  ) : selectedDoc.mimeType === 'application/pdf' ? (
                    <iframe src={previewUrl} className="w-full h-96" title={selectedDoc.fileName} />
                  ) : (
                    <div className="p-4 bg-gray-50 text-center">
                      <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Prévisualisation non disponible pour ce type de fichier</p>
                    </div>
                  )}
                </div>
              )}

              {/* ML classification */}
              {selectedDoc.confidenceScore > 0 && (
                <div className={`p-3 rounded-xl text-sm ${confidenceBadge(selectedDoc.confidenceScore)}`}>
                  🤖 Type détecté par IA : <strong>{selectedDoc.detectedType}</strong> (confiance {selectedDoc.confidenceScore}%)
                </div>
              )}

              {/* Rejection reason */}
              {selectedDoc.rejectionReason && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-sm text-red-700">
                  <strong>Motif de rejet :</strong> {selectedDoc.rejectionReason}
                </div>
              )}

              {/* Actions for PENDING */}
              {selectedDoc.status === 'PENDING' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motif de rejet (si applicable)</label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Saisir le motif de rejet..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedDoc.documentId)}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 font-semibold"
                    >
                      ✅ Approuver
                    </button>
                    <button
                      onClick={() => handleReject(selectedDoc.documentId)}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="flex-1 py-2.5 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold"
                    >
                      ❌ Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
