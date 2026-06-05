import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    LogOut, BarChart3, Calendar, TrendingUp, Users, DollarSign,
    CheckCircle, Clock, Loader2, RefreshCw, Bell, Sparkles, Send, Activity,
    Trash2, ChevronDown, ChevronUp, Mail, Phone, FileText, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, getErrorMessage, servicesApi } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { formatTime } from '../utils/formatters'

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-sky-50 text-sky-700 border border-sky-200',
    cancelled: 'bg-rose-50 text-rose-700 border border-rose-200'
}

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

export default function Admin() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [appointments, setAppointments] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [servicesData, setServicesData] = useState([])
    const [editingServiceId, setEditingServiceId] = useState(null)
    const [editPrice, setEditPrice] = useState('')
    const [notificationForm, setNotificationForm] = useState({ title: '', message: '' })
    const [statusFilter, setStatusFilter] = useState('')
    const [updatingId, setUpdatingId] = useState(null)
    const [pendingDeleteId, setPendingDeleteId] = useState(null)

    // New state to track which row is expanded
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        if (!user) { navigate('/login'); return }
        if (user.role !== 'admin') { toast.error('Admin access required'); navigate('/'); return }
    }, [user, navigate])

    const fetchStats = async () => {
        try {
            const { data } = await adminApi.getStats()
            setStats(data.stats)
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchAppointments = async () => {
        try {
            const { data } = await adminApi.getAppointments()
            setAppointments(data.appointments || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchAnalytics = async () => {
        try {
            const { data } = await adminApi.getAnalytics()
            setAnalytics(data.analytics)
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchNotifications = async () => {
        try {
            const { data } = await adminApi.getNotifications()
            setNotifications(data.notifications || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const fetchServices = async () => {
        try {
            const { data } = await servicesApi.getAll()
            setServicesData(data.services || [])
        } catch (e) { toast.error(getErrorMessage(e)) }
    }

    const loadAll = async () => {
        setLoading(true)
        await Promise.all([fetchStats(), fetchAppointments(), fetchAnalytics(), fetchNotifications(), fetchServices()])
        setLoading(false)
    }

    useEffect(() => { if (user?.role === 'admin') loadAll() }, [user])

    const handleStatusUpdate = async (id, newStatus, e) => {
        e.stopPropagation(); // Prevent row from expanding when changing status
        setUpdatingId(id)
        try {
            await adminApi.updateStatus(id, newStatus)
            toast.success(`Appointment marked as ${newStatus}`)
            fetchAppointments()
            fetchStats()
        } catch (e) {
            toast.error(getErrorMessage(e))
        } finally {
            setUpdatingId(null)
        }
    }

    const handleDeleteAppointment = async (id, e) => {
        e.stopPropagation(); // Prevent row from expanding
        setPendingDeleteId(id)
    }

    const confirmDeleteAppointment = async () => {
        if (!pendingDeleteId) return
        try {
            await adminApi.deleteAppointment(pendingDeleteId)
            toast.success('Booking removed successfully')
            fetchAppointments()
            fetchStats()
        } catch (e) {
            toast.error(getErrorMessage(e))
        } finally {
            setPendingDeleteId(null)
        }
    }

    const handleLogout = () => {
        logout()
        toast.success('Logged out')
        navigate('/')
    }

    const handleCreateNotification = async (e) => {
        e.preventDefault()
        if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
            toast.error('Title and message are required')
            return
        }
        try {
            await adminApi.createNotification({
                title: notificationForm.title.trim(),
                message: notificationForm.message.trim()
            })
            toast.success('Notification sent to all users')
            setNotificationForm({ title: '', message: '' })
            fetchNotifications()
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    const handleUpdatePrice = async (id) => {
        if (!editPrice || isNaN(editPrice) || editPrice <= 0) {
            toast.error('Please enter a valid price')
            return
        }
        try {
            await adminApi.updateServicePrice(id, editPrice)
            toast.success('Service price updated successfully')
            setEditingServiceId(null)
            fetchServices()
        } catch (e) {
            toast.error(getErrorMessage(e))
        }
    }

    // Filter and sort appointments ascending by date and time
    const filteredAppointments = useMemo(() => {
        let filtered = statusFilter ? appointments.filter(a => a.status === statusFilter) : [...appointments];
        return filtered.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
            return dateA - dateB;
        });
    }, [appointments, statusFilter]);

    const StatCard = ({ icon: Icon, label, value, change, color, bg }) => (
        <motion.div whileHover={{ y: -4 }} className='bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60'>
            <div className='flex items-center justify-between mb-4'>
                <div className={`p-3 rounded-2xl ${bg}`}><Icon size={22} className={color} /></div>
            </div>
            <h3 className='text-slate-500 text-xs font-bold uppercase tracking-wider mb-1'>{label}</h3>
            <div className='flex items-end gap-3'>
                <p className='text-3xl font-extrabold text-slate-900 leading-none'>{value ?? '—'}</p>
                {change && <p className='text-emerald-600 text-xs font-bold mb-1'>{change}</p>}
            </div>
        </motion.div>
    )

    if (loading) {
        return (
            <div className='min-h-screen bg-slate-50 pt-20 flex items-center justify-center'>
                <div className='text-center'>
                    <Loader2 className='animate-spin text-purple-600 mx-auto mb-4' size={40} />
                    <p className='text-slate-600 font-medium'>Syncing administration data...</p>
                </div>
            </div>
        )
    }

    const maxRevenue = analytics?.monthlyData?.length
        ? Math.max(...analytics.monthlyData.map(d => d.revenue), 1) : 1

    return (
        <div className='min-h-screen bg-slate-50 font-sans pb-12'>
            {/* Header */}
            <div className='bg-white border-b border-slate-200/60 sticky top-0 z-30 shadow-sm'>
                <div className='max-w-[90rem] mx-auto px-4 md:px-8 py-4 flex justify-between items-center'>
                    <div className='flex items-center gap-4'>
                        <div className='w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-md shadow-slate-900/20'>
                            <Activity size={22} className='text-white' />
                        </div>
                        <div>
                            <h1 className='text-xl font-extrabold text-slate-900 tracking-tight'>Timmy Tails Admin</h1>
                            <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>Admin Panel</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-2 md:gap-4'>
                        <button onClick={loadAll} className='p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500' title='Refresh Data'>
                            <RefreshCw size={18} />
                        </button>
                        <div className='w-px h-6 bg-slate-200 hidden md:block'></div>
                        <button onClick={handleLogout} className='flex items-center gap-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 md:px-4 py-2 rounded-xl text-sm font-bold transition-all'>
                            <LogOut size={18} /> <span className='hidden md:inline'>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Layout Container */}
            <div className='max-w-[90rem] mx-auto px-4 md:px-8 mt-8'>

                {/* Segmented Control Tabs */}
                <div className='bg-slate-200/50 p-1.5 rounded-2xl inline-flex overflow-x-auto max-w-full scrollbar-none mb-8'>
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'appointments', label: 'Appointments', icon: Calendar },
                        { id: 'services', label: 'Services Pricing', icon: DollarSign },
                        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                        { id: 'ml-trends', label: 'ML Trends', icon: Sparkles },
                        { id: 'notifications', label: 'Notifications', icon: Bell }
                    ].map(tab => {
                        const isActive = activeTab === tab.id
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`py-2.5 px-5 font-bold text-sm flex items-center gap-2 rounded-xl whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                <tab.icon size={16} className={isActive ? 'text-purple-600' : ''} /> {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>

                        {/* Stat Cards */}
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                            <StatCard icon={Calendar} label="Today's Appointments" value={stats?.todayAppointments ?? 0} color='text-blue-600' bg='bg-blue-50' />
                            <StatCard icon={DollarSign} label='Monthly Revenue' value={stats?.monthlyRevenue} color='text-emerald-600' bg='bg-emerald-50' />
                            <StatCard icon={Users} label='Total Customers' value={stats?.totalCustomers ?? 0} color='text-indigo-600' bg='bg-indigo-50' />
                            <StatCard icon={CheckCircle} label='Confirmed Bookings' value={stats?.confirmedBookings ?? 0} change={`${stats?.pendingAppointments ?? 0} pending`} color='text-amber-600' bg='bg-amber-50' />
                        </div>

                        <div className='grid lg:grid-cols-3 gap-8'>
                            {/* Revenue Chart */}
                            {analytics?.monthlyData?.length > 0 && (
                                <div className='lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60'>
                                    <h2 className='text-lg font-bold text-slate-900 mb-8'>Revenue Overview</h2>
                                    <div className='h-64 flex items-end gap-2 sm:gap-4 justify-between pt-4 border-b border-slate-100'>
                                        {analytics.monthlyData.map((d, idx) => (
                                            <div key={idx} className='flex-1 flex flex-col items-center gap-3 group'>
                                                <span className='text-[10px] sm:text-xs text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity'>
                                                    ₱{(d.revenue / 1000).toFixed(1)}K
                                                </span>
                                                <div className='w-full relative flex justify-center'>
                                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxRevenue) * 200}px` }} transition={{ delay: idx * 0.05, duration: 0.8, type: 'spring' }}
                                                        className='w-full max-w-[40px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-xl min-h-[4px]' />
                                                </div>
                                                <span className='text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide mt-2'>{d.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Appointments Feed */}
                            <div className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 flex flex-col'>
                                <div className='flex justify-between items-center mb-6'>
                                    <h2 className='text-lg font-bold text-slate-900'>Recent Activity</h2>
                                    <button onClick={() => setActiveTab('appointments')} className='text-xs font-bold text-purple-600 hover:text-purple-800'>View All</button>
                                </div>

                                {appointments.length > 0 ? (
                                    <div className='space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200'>
                                        {/* Uses the UNFILTERED appointments array so it always shows the latest */}
                                        {appointments.slice().sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5).map((a, idx) => (
                                            <div key={idx} className='flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100'>
                                                <div className='w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0'>
                                                    <span className='font-bold text-slate-700 text-sm'>{a.petName?.slice(0, 1)}</span>
                                                </div>
                                                <div className='flex-1 min-w-0'>
                                                    <p className='font-bold text-slate-900 text-sm truncate'>
                                                        {a.petName} <span className='text-slate-400 font-medium'>({a.breed})</span>
                                                    </p>
                                                    <p className='text-xs text-slate-500 mt-0.5 truncate'>{a.service}</p>
                                                    <p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2'>{formatDate(a.date)} · {formatTime(a.time)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-slate-500 text-sm text-center py-10 my-auto'>No recent appointments.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- APPOINTMENTS TAB --- */}
                {activeTab === 'appointments' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-6'>
                        {/* Filters */}
                        <div className='flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60'>
                            <span className='text-slate-500 font-bold text-xs uppercase tracking-wider shrink-0'>Filter Status:</span>
                            <div className='flex flex-wrap gap-2'>
                                {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        {s || 'All Appointments'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div className='bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden'>
                            <div className='p-6 border-b border-slate-100 flex justify-between items-center'>
                                <h2 className='text-lg font-bold text-slate-900'>
                                    {filteredAppointments.length} Booking{filteredAppointments.length !== 1 ? 's' : ''} Found
                                </h2>
                            </div>

                            {filteredAppointments.length === 0 ? (
                                <div className='p-16 text-center'>
                                    <Calendar className='mx-auto text-slate-300 mb-4' size={48} />
                                    <p className='text-slate-500 font-medium'>No appointments match this filter.</p>
                                </div>
                            ) : (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-sm text-left'>
                                        <thead className='bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold'>
                                            <tr>
                                                <th className='px-6 py-4 w-10'></th>
                                                <th className='px-6 py-4'>Client & Pet</th>
                                                <th className='px-6 py-4'>Service Info</th>
                                                <th className='px-6 py-4'>Schedule</th>
                                                <th className='px-6 py-4'>Status</th>
                                                <th className='px-6 py-4 text-right'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100'>
                                            {filteredAppointments.map((a) => {
                                                const isExpanded = expandedId === a._id;

                                                return (
                                                    <React.Fragment key={a._id}>
                                                        {/* Main Row */}
                                                        <tr
                                                            onClick={() => setExpandedId(isExpanded ? null : a._id)}
                                                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/50' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <td className='px-6 py-4 text-slate-400'>
                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            </td>
                                                            <td className='px-6 py-4'>
                                                                <div className='flex items-center gap-2'>
                                                                    <p className='font-bold text-slate-900'>{a.ownerName}</p>
                                                                </div>
                                                                <p className='text-xs text-slate-500 mt-0.5'>{a.petName} ({a.breed})</p>
                                                            </td>
                                                            <td className='px-6 py-4'>
                                                                <p className='font-semibold text-slate-800'>{a.service}</p>
                                                                {a.haircutStyle && <p className='text-xs text-purple-600 mt-0.5 font-medium'>Style: {a.haircutStyle}</p>}
                                                            </td>
                                                            <td className='px-6 py-4'>
                                                                <p className='font-bold text-slate-800'>{formatDate(a.date)}</p>
                                                                <p className='text-xs text-slate-500 mt-0.5'>{formatTime(a.time)}</p>
                                                            </td>
                                                            <td className='px-6 py-4'>
                                                                <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${STATUS_STYLES[a.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                                    {a.status}
                                                                </span>
                                                            </td>
                                                            <td className='px-6 py-4 text-right'>
                                                                <div className='flex justify-end items-center gap-3'>
                                                                    {updatingId === a._id ? (
                                                                        <Loader2 className='animate-spin text-purple-600' size={18} />
                                                                    ) : (
                                                                        <div className='inline-block relative' onClick={e => e.stopPropagation()}>
                                                                            <select value={a.status} onChange={(e) => handleStatusUpdate(a._id, e.target.value, e)}
                                                                                className='appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20'>
                                                                                {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                                                                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                                                ))}
                                                                            </select>
                                                                            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400'>
                                                                                <ChevronDown size={14} />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {/* Delete Fake/Spam Booking Button */}
                                                                    <button
                                                                        onClick={(e) => handleDeleteAppointment(a._id, e)}
                                                                        className='text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors'
                                                                        title='Delete Booking'
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Details Row */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={6} className='p-0 border-b border-slate-100'>
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className='overflow-hidden bg-slate-50/80 border-t border-slate-100'
                                                                        >
                                                                            <div className='p-6 md:pl-20 grid md:grid-cols-3 gap-6'>
                                                                                <div className='space-y-3'>
                                                                                    <h4 className='text-xs font-bold text-slate-400 uppercase tracking-wider'>Contact Info</h4>
                                                                                    <p className='flex items-center gap-2 text-sm text-slate-700'>
                                                                                        <Mail size={14} className='text-slate-400' /> {a.ownerEmail || 'No email provided'}
                                                                                    </p>
                                                                                    <p className='flex items-center gap-2 text-sm text-slate-700'>
                                                                                        <Phone size={14} className='text-slate-400' /> {a.ownerPhone || 'No phone provided'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className='space-y-3'>
                                                                                    <h4 className='text-xs font-bold text-slate-400 uppercase tracking-wider'>Financial</h4>
                                                                                    <p className='text-sm text-slate-700 font-medium'>
                                                                                        Total Price: <span className='text-emerald-600 font-bold'>₱{a.price?.toLocaleString() || '—'}</span>
                                                                                    </p>
                                                                                </div>
                                                                                <div className='space-y-3'>
                                                                                    <h4 className='text-xs font-bold text-slate-400 uppercase tracking-wider'>Special Notes</h4>
                                                                                    <div className='flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200'>
                                                                                        <FileText size={14} className='text-slate-400 shrink-0 mt-0.5' />
                                                                                        <p className='text-sm text-slate-600 italic'>
                                                                                            {a.notes ? a.notes : 'No special requests provided.'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </AnimatePresence>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- SERVICES PRICING TAB --- */}
                {activeTab === 'services' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-6'>
                        <div className='bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden'>
                            <div className='p-6 border-b border-slate-100'>
                                <h2 className='text-lg font-bold text-slate-900 flex items-center gap-2'>
                                    <DollarSign size={20} className='text-purple-600' /> Manage Service Prices
                                </h2>
                                <p className='text-sm text-slate-500 mt-1'>Update the prices of available grooming services. These changes will reflect immediately for all users.</p>
                            </div>
                            
                            <div className='overflow-x-auto'>
                                <table className='w-full text-sm text-left'>
                                    <thead className='bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold'>
                                        <tr>
                                            <th className='px-6 py-4'>Service</th>
                                            <th className='px-6 py-4'>Description</th>
                                            <th className='px-6 py-4'>Duration</th>
                                            <th className='px-6 py-4'>Price (₱)</th>
                                            <th className='px-6 py-4 text-right'>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                        {servicesData.map((service) => (
                                            <tr key={service.id} className='hover:bg-slate-50 transition-colors'>
                                                <td className='px-6 py-4 font-bold text-slate-900'>{service.name}</td>
                                                <td className='px-6 py-4 text-slate-600 max-w-xs truncate' title={service.description}>{service.description}</td>
                                                <td className='px-6 py-4 text-slate-500'>{service.duration}</td>
                                                <td className='px-6 py-4'>
                                                    {editingServiceId === service.id ? (
                                                        <div className='flex items-center gap-2'>
                                                            <span className='text-slate-400'>₱</span>
                                                            <input 
                                                                type='number' 
                                                                className='w-24 px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-sm'
                                                                value={editPrice}
                                                                onChange={(e) => setEditPrice(e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className='font-bold text-emerald-600 text-base'>₱{service.price?.toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className='px-6 py-4 text-right'>
                                                    {editingServiceId === service.id ? (
                                                        <div className='flex justify-end items-center gap-2'>
                                                            <button 
                                                                onClick={() => handleUpdatePrice(service.id)}
                                                                className='px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors'>
                                                                Save
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingServiceId(null)}
                                                                className='px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors'>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingServiceId(service.id)
                                                                setEditPrice(service.price)
                                                            }}
                                                            className='px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors'>
                                                            Edit Price
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- ANALYTICS TAB --- */}
                {activeTab === 'analytics' && analytics && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>

                            {/* Service Distribution */}
                            <div className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60'>
                                <h3 className='text-lg font-bold text-slate-900 mb-6'>Service Distribution</h3>
                                {analytics.serviceDistribution.length > 0 ? (
                                    <div className='space-y-5'>
                                        {analytics.serviceDistribution.map((s, idx) => (
                                            <div key={idx}>
                                                <div className='flex justify-between items-end mb-2'>
                                                    <span className='text-sm text-slate-700 font-bold'>{s.name}</span>
                                                    <span className='text-xs font-bold text-slate-400'>{s.percentage}%</span>
                                                </div>
                                                <div className='w-full h-2.5 bg-slate-100 rounded-full overflow-hidden'>
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }} transition={{ delay: idx * 0.1, duration: 0.8 }}
                                                        className='h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full' />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className='text-slate-500 text-sm'>No service data available yet.</p>}
                            </div>

                            {/* Monthly Booking Volume */}
                            <div className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60'>
                                <h3 className='text-lg font-bold text-slate-900 mb-8'>Booking Volume</h3>
                                {analytics.monthlyData.length > 0 ? (
                                    <div className='h-56 flex items-end gap-3 sm:gap-6 justify-between border-b border-slate-100 pt-4'>
                                        {analytics.monthlyData.map((d, idx) => {
                                            const maxApts = Math.max(...analytics.monthlyData.map(x => x.appointments), 1)
                                            return (
                                                <div key={idx} className='flex-1 flex flex-col items-center gap-2 group'>
                                                    <span className='text-xs text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity'>{d.appointments}</span>
                                                    <div className='w-full relative flex justify-center'>
                                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.appointments / maxApts) * 160}px` }} transition={{ delay: idx * 0.05, duration: 0.8 }}
                                                            className='w-full max-w-[32px] bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg min-h-[4px]' />
                                                    </div>
                                                    <span className='text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide mt-2'>{d.month}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : <p className='text-slate-500 text-sm'>No volume data yet.</p>}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- ML TRENDS TAB --- */}
                {activeTab === 'ml-trends' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>

                        <div className='bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden'>
                            <div className='absolute right-0 top-0 opacity-10 pointer-events-none scale-150 transform translate-x-1/4 -translate-y-1/4'>
                                <Sparkles size={250} />
                            </div>
                            <div className='relative z-10'>
                                <div className='inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase mb-4 text-indigo-200 border border-white/10'>
                                    <Activity size={14} /> AI Engine Active
                                </div>
                                <h2 className='text-3xl font-extrabold mb-3'>Smart Trend Analysis</h2>
                                <p className='text-indigo-200 max-w-xl text-sm leading-relaxed'>Machine learning predictions utilizing local climate data and historical booking patterns to forecast trending styles by breed.</p>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                            {[
                                { color: 'text-amber-600', bg: 'bg-amber-50', title: 'Seasonal Matrix', body: 'Current Season: Dry/Hot', sub: 'Algorithm prioritizing short, breathable trims.' },
                                { color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Breed Insights', body: 'Dynamic Targeting', sub: 'Adapting recommendations based on top-booked breeds.' },
                                { color: 'text-purple-600', bg: 'bg-purple-50', title: 'System Status', body: 'Model Synced', sub: 'Serving real-time suggestions to user dashboards.' }
                            ].map((card) => (
                                <div key={card.title} className='bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60'>
                                    <div className={`inline-flex p-2.5 rounded-xl ${card.bg} ${card.color} mb-4`}>
                                        <Sparkles size={20} />
                                    </div>
                                    <h4 className='font-bold text-slate-900 mb-1'>{card.title}</h4>
                                    <p className='text-sm font-semibold text-slate-700 mb-1'>{card.body}</p>
                                    <p className='text-xs text-slate-400'>{card.sub}</p>
                                </div>
                            ))}
                        </div>

                        <div className='bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden'>
                            <div className='p-6 border-b border-slate-100'>
                                <h3 className='text-lg font-bold text-slate-900'>Live Trending Haircuts</h3>
                            </div>
                            {analytics?.trendingData?.length > 0 ? (
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-sm text-left'>
                                        <thead className='bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold'>
                                            <tr>
                                                <th className='px-6 py-4'>Dog Breed</th>
                                                <th className='px-6 py-4'>Top Style Match</th>
                                                <th className='px-6 py-4'>ML Confidence Score</th>
                                                <th className='px-6 py-4 text-right'>Total Bookings</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100'>
                                            {analytics.trendingData.map((t, idx) => (
                                                <tr key={idx} className='hover:bg-slate-50 transition-colors'>
                                                    <td className='px-6 py-4 font-bold text-slate-900 flex items-center gap-3'>
                                                        <span className='text-slate-300 text-xs'>#{idx + 1}</span> {t.breed}
                                                    </td>
                                                    <td className='px-6 py-4'>
                                                        <span className='px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold'>{t.haircut}</span>
                                                    </td>
                                                    <td className='px-6 py-4 w-1/3'>
                                                        <div className='flex items-center gap-3'>
                                                            <div className='flex-1 h-2 bg-slate-100 rounded-full overflow-hidden'>
                                                                <div className='h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full' style={{ width: `${t.trend}%` }} />
                                                            </div>
                                                            <span className='font-bold text-slate-700 text-xs w-8'>{t.trend}%</span>
                                                        </div>
                                                    </td>
                                                    <td className='px-6 py-4 font-extrabold text-slate-900 text-right'>{t.bookings}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className='text-center py-16'>
                                    <TrendingUp className='mx-auto text-slate-300 mb-4' size={40} />
                                    <p className='text-slate-500 font-medium'>Awaiting sufficient booking data to generate trends.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- NOTIFICATIONS TAB --- */}
                {activeTab === 'notifications' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='grid lg:grid-cols-5 gap-8 items-start'>

                        {/* Composer */}
                        <div className='lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 sticky top-28'>
                            <h3 className='text-lg font-bold text-slate-900 mb-6 flex items-center gap-2'>
                                <Send size={20} className='text-purple-600' /> Broadcast Message
                            </h3>
                            <form onSubmit={handleCreateNotification} className='space-y-5'>
                                <div>
                                    <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Alert Title</label>
                                    <input value={notificationForm.title} onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                                        className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium'
                                        placeholder='e.g., Holiday Grooming Promo!' />
                                </div>
                                <div>
                                    <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Message Body</label>
                                    <textarea value={notificationForm.message} onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))} rows={5}
                                        className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium resize-none'
                                        placeholder='Write your announcement here...' />
                                </div>
                                <button type='submit' className='w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2'>
                                    Push to All Users
                                </button>
                            </form>
                        </div>

                        {/* History Log */}
                        <div className='lg:col-span-3 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60'>
                            <h3 className='text-lg font-bold text-slate-900 mb-6'>Broadcast History</h3>
                            {notifications.length === 0 ? (
                                <div className='py-16 text-center text-slate-500'>
                                    <Bell className='mx-auto text-slate-300 mb-4' size={40} />
                                    <p className='font-medium'>No announcements sent yet.</p>
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    {notifications.map((n) => (
                                        <div key={n._id} className='p-5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4'>
                                            <div className='mt-1 bg-white p-2 rounded-full shadow-sm shrink-0 border border-slate-200'>
                                                <Bell size={16} className='text-purple-600' />
                                            </div>
                                            <div>
                                                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5'>
                                                    <p className='font-bold text-slate-900'>{n.title}</p>
                                                    <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/50 px-2 py-0.5 rounded-md'>
                                                        {new Date(n.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className='text-sm text-slate-600 leading-relaxed'>{n.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {pendingDeleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4'
                        onClick={() => setPendingDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className='w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex items-start gap-3'>
                                <div className='p-2 rounded-xl bg-rose-50 text-rose-600'>
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h3 className='text-base font-bold text-slate-900'>Delete this booking?</h3>
                                    <p className='text-sm text-slate-600 mt-1'>This action is permanent and cannot be undone.</p>
                                </div>
                            </div>
                            <div className='mt-6 flex justify-end gap-2'>
                                <button
                                    onClick={() => setPendingDeleteId(null)}
                                    className='px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteAppointment}
                                    className='px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors'
                                >
                                    Delete Booking
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}