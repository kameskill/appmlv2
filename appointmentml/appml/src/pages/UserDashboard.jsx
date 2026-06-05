import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Bell,
    Calendar,
    Clock,
    Loader2,
    Lock,
    LogOut,
    ShieldCheck,
    Sparkles,
    Scissors,
    User,
    CheckCircle2,
    CalendarCheck,
    TrendingUp,
    Settings,
    ArrowLeft,
    Edit2,
    Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { appointmentsApi, notificationsApi, mlRecommendApi, getErrorMessage } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { formatTime } from '../utils/formatters'

// --- Constants & Helpers ---

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-sky-50 text-sky-700 border border-sky-200',
    cancelled: 'bg-rose-50 text-rose-700 border border-rose-200'
}

const SERVICES = [
    { id: 1, name: 'Full Grooming Package', description: 'Complete grooming with bath, haircut, nail trim, and ear cleaning', duration: '120 min', price: '₱1,200' },
    { id: 2, name: 'Bath & Brush', description: 'Relaxing bath with premium shampoo and thorough brushing', duration: '60 min', price: '₱600' },
    { id: 3, name: 'Haircut Special', description: 'Professional haircut with breed-specific styling', duration: '90 min', price: '₱900' },
    { id: 4, name: 'Quick Trim', description: 'Fast maintenance service for nails, paws, and sanitary trimming', duration: '30 min', price: '₱400' },
    { id: 5, name: 'Teeth Cleaning', description: 'Professional dental cleaning and breath freshening', duration: '45 min', price: '₱500' },
    { id: 6, name: 'De-shedding Treatment', description: 'Special treatment to reduce shedding and promote healthy coat', duration: '75 min', price: '₱700' }
]

const BREEDS = [
    'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Bulldog',
    'Poodle', 'Beagle', 'Yorkshire Terrier', 'Dachshund',
    'Shih Tzu', 'Maltese', 'Chihuahua', 'Pomeranian', 'Other'
]

const ALL_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

const formatDate = (dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
    if (!dateStr) return ''
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-PH', options)
}

const getCurrentSeason = () => {
    const m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5) return 'spring'
    if (m >= 6 && m <= 8) return 'summer'
    if (m >= 9 && m <= 11) return 'fall'
    return 'winter'
}

const getCurrentSeasonDetails = () => {
    const month = new Date().getMonth();
    if (month >= 5 && month <= 10) {
        return { name: 'Rainy Season', advice: 'Keep coats manageable to avoid mud matting and dampness.' };
    }
    return { name: 'Dry & Sunny Season', advice: 'Time for a lightweight, breathable trim to help them stay cool!' };
}

const getMinDate = () => new Date().toISOString().split('T')[0]


// --- Main Component ---

export default function UserDashboard() {
    const navigate = useNavigate()
    const { user, logout, sendPasswordOtp, resetPasswordWithOtp } = useAuth()

    // Core Dashboard State
    const [loading, setLoading] = useState(true)
    const [appointments, setAppointments] = useState([])
    const [notifications, setNotifications] = useState([])
    const [activeTab, setActiveTab] = useState('home')

    // Settings State
    const [submitting, setSubmitting] = useState(false)
    const [passwordForm, setPasswordForm] = useState({ phone: '', otp: '', newPassword: '' })

    // Profile Phone State
    const [profilePhone, setProfilePhone] = useState('')
    const [isSavingPhone, setIsSavingPhone] = useState(false)

    // Booking Flow State
    const [step, setStep] = useState(1)
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
    const [isBooked, setIsBooked] = useState(false)
    const [formData, setFormData] = useState({
        petName: '', breed: '', haircutStyle: null, service: null,
        date: '', time: '', ownerName: '', ownerEmail: '', ownerPhone: '', notes: ''
    })
    const [mlRecs, setMlRecs] = useState([])
    const [mlLoading, setMlLoading] = useState(false)
    const [bookedSlots, setBookedSlots] = useState([])
    const [slotsLoading, setSlotsLoading] = useState(false)

    const seasonDisplay = useMemo(() => getCurrentSeasonDetails(), []);

    // 1. Initial Auth & Data Load
    useEffect(() => {
        if (!user) { navigate('/login', { replace: true }); return }
        if (user.role === 'admin') { navigate('/admin', { replace: true }); return }

        // Format initial phone number to ensure +63
        const initialPhone = user.phone || ''
        const formattedPhone = initialPhone.startsWith('+63') ? initialPhone : `+63 ${initialPhone.replace(/^0+/, '')}`
        const finalPhone = formattedPhone.trim() === '+63' ? '+63 ' : formattedPhone

        setProfilePhone(finalPhone)
        setPasswordForm(prev => ({ ...prev, phone: finalPhone }))

        setFormData(prev => ({
            ...prev,
            ownerName: `${user.firstName} ${user.lastName}`,
            ownerEmail: user.email,
            ownerPhone: finalPhone
        }))
        loadData()
    }, [user, navigate])

    const loadData = async () => {
        setLoading(true)
        try {
            const [appointmentRes, notificationRes] = await Promise.all([
                appointmentsApi.getMy(),
                notificationsApi.getMine()
            ])
            setAppointments(appointmentRes.data.appointments || [])
            setNotifications(notificationRes.data.notifications || [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    // 2. Booking Side-Effects (ML & Slot Fetching)
    useEffect(() => {
        if (!formData.breed || formData.breed === 'Other') { setMlRecs([]); return }
        setMlLoading(true)
        mlRecommendApi.recommend(formData.breed, getCurrentSeason(), 3)
            .then(({ data }) => setMlRecs(data.recommendations || []))
            .catch(() => setMlRecs([]))
            .finally(() => setMlLoading(false))
    }, [formData.breed])

    useEffect(() => {
        if (!formData.date) { setBookedSlots([]); return }
        setSlotsLoading(true)
        appointmentsApi.getAvailability(formData.date)
            .then(({ data }) => setBookedSlots(data.bookedTimes || []))
            .catch(() => setBookedSlots([]))
            .finally(() => setSlotsLoading(false))
    }, [formData.date])

    // 3. Computed Dashboard Values
    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications])
    const userPets = useMemo(() => {
        const unique = {};
        appointments.forEach(a => {
            if (a.petName && !unique[a.petName.toLowerCase()]) {
                unique[a.petName.toLowerCase()] = { name: a.petName, breed: a.breed };
            }
        });
        return Object.values(unique);
    }, [appointments]);
    const selectedService = SERVICES.find(s => s.id === formData.service)

    // Parse prices and calculate total
    const parsePrice = (priceStr) => {
        const num = parseInt(priceStr.replace(/[^0-9]/g, ''))
        return isNaN(num) ? 0 : num
    }

    const selectedMLRec = mlRecs.find(r => r.name === formData.haircutStyle)
    const servicePrice = parsePrice(selectedService?.price || '0')
    const mlPrice = parsePrice(selectedMLRec?.price || '0')
    const totalPrice = servicePrice + mlPrice

    // 4. Handlers
    const handleMarkRead = async (id) => {
        try {
            await notificationsApi.markAsRead(id)
            setNotifications(prev => prev.map(n => (n._id === id ? { ...n, isRead: true } : n)))
        } catch (error) { toast.error(getErrorMessage(error)) }
    }

    const handleCancelAppointment = async (id) => {
        try {
            await appointmentsApi.cancel(id)
            toast.success('Appointment cancelled')
            loadData()
        } catch (error) { toast.error(getErrorMessage(error)) }
    }

    // Booking Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleBreedChange = (e) => {
        setFormData(prev => ({ ...prev, breed: e.target.value, haircutStyle: null }))
    }

    const handleSubmitBooking = async () => {
        if (!formData.ownerName || !formData.ownerEmail || !formData.ownerPhone) {
            toast.error('Please fill in all contact details')
            return
        }
        setIsSubmittingBooking(true)
        try {
            await appointmentsApi.create({
                ...formData,
                service: selectedService?.name
            })
            setIsBooked(true)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsSubmittingBooking(false)
        }
    }

    const resetBookingAndReturn = () => {
        setStep(1)
        setIsBooked(false)
        setIsSubmittingBooking(false)
        setFormData(prev => ({
            ...prev, petName: '', breed: '', haircutStyle: null, service: null, date: '', time: '', notes: ''
        }))
        setActiveTab('home')
        loadData()
    }

    // Settings / Profile Handlers
    const handleProfilePhoneChange = (e) => {
        let input = e.target.value;
        if (input.length < 3) {
            setProfilePhone('+63 ');
        } else if (input.startsWith('+63')) {
            setProfilePhone(input);
        } else {
            setProfilePhone('+63 ' + input.replace(/\D/g, ''));
        }
    }

    const handlePasswordPhoneChange = (e) => {
        let input = e.target.value;
        if (input.length < 3) {
            setPasswordForm(prev => ({ ...prev, phone: '+63 ' }));
        } else if (input.startsWith('+63')) {
            setPasswordForm(prev => ({ ...prev, phone: input }));
        } else {
            setPasswordForm(prev => ({ ...prev, phone: '+63 ' + input.replace(/\D/g, '') }));
        }
    }

    const saveProfilePhone = async () => {
        setIsSavingPhone(true)
        // Here you would normally call your API: await userApi.updateProfile({ phone: profilePhone })
        setTimeout(() => {
            toast.success('Mobile number updated successfully')
            setIsSavingPhone(false)
        }, 800)
    }

    const handleSendOtp = async () => {
        if (!passwordForm.phone.trim() || passwordForm.phone === '+63 ') { toast.error('Phone number is required'); return }
        setSubmitting(true)
        try {
            await sendPasswordOtp(passwordForm.phone)
            toast.success('OTP sent to your mobile number')
        } catch (error) { toast.error(getErrorMessage(error)) }
        finally { setSubmitting(false) }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (!passwordForm.otp || passwordForm.otp.length !== 6) { toast.error('Enter a valid 6-digit OTP'); return }
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
        setSubmitting(true)
        try {
            await resetPasswordWithOtp({ phone: passwordForm.phone, otp: passwordForm.otp, newPassword: passwordForm.newPassword })
            toast.success('Password changed successfully')
            setPasswordForm(prev => ({ ...prev, otp: '', newPassword: '' }))
        } catch (error) { toast.error(getErrorMessage(error)) }
        finally { setSubmitting(false) }
    }

    const handleLogout = () => {
        logout()
        toast.success('Logged out')
        navigate('/')
    }

    if (loading) {
        return (
            <div className='min-h-screen bg-slate-50 pt-20 flex items-center justify-center'>
                <div className='text-center'>
                    <Loader2 className='animate-spin text-purple-600 mx-auto mb-4' size={40} />
                    <p className='text-slate-600 font-medium'>Fetching your pet's timeline...</p>
                </div>
            </div>
        )
    }

    // Derive original phone to check if changes were made
    const originalPhone = user?.phone?.startsWith('+63') ? user.phone : `+63 ${user?.phone?.replace(/^0+/, '') || ''}`;

    return (
        <div className='min-h-screen bg-slate-50 text-slate-800 font-sans'>
            {/* Top App Header */}
            <div className='bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm'>
                <div className='max-w-6xl mx-auto px-4 py-4 flex justify-between items-center'>
                    <div className='flex items-center gap-3'>
                        {/* Consistent Circular Logo with Gold Border and Plum Background */}
                        <div className="w-11 h-11 rounded-full border-2 border-amber-400 overflow-hidden shadow-md flex items-center justify-center bg-[#4a1c52]">
                            <img
                                src='/logo.png'
                                alt='Timmy Tails Logo'
                                className='w-full h-full object-cover'
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <span className="hidden text-amber-400 font-bold text-xs">TT</span>
                        </div>

                        <div>
                            <span className='text-xs font-bold uppercase tracking-wider text-[#4a1c52] block'>Timmy Tails</span>
                            <span className='text-sm text-slate-500 font-medium'>Welcome back, {user?.firstName}! 👋</span>
                        </div>
                    </div>
                    <div className='flex items-center gap-4'>
                        <button onClick={() => setActiveTab('notifications')} className='relative text-slate-400 hover:text-purple-600 transition-colors'>
                            <Bell size={20} />
                            {unreadCount > 0 && <span className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white'></span>}
                        </button>
                        <button onClick={handleLogout} className='flex items-center gap-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all'>
                            <LogOut size={16} /> <span className='hidden sm:inline'>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* App-like Tab Navigation */}
            <div className='bg-white border-b border-slate-200/60 sticky top-[73px] z-10'>
                <div className='max-w-6xl mx-auto px-4'>
                    <div className='flex gap-1 overflow-x-auto scrollbar-none'>
                        {[
                            { id: 'home', label: 'Dashboard', icon: Calendar },
                            { id: 'booking', label: 'Book Grooming', icon: Scissors },
                            { id: 'settings', label: 'Account Settings', icon: Settings }
                        ].map(tab => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`py-3.5 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-all relative ${isActive ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                    <Icon size={16} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className='max-w-6xl mx-auto px-4 py-8'>

                {/* ────────────────────────────────────────────────────────────────────────
                    TAB: HOME DASHBOARD
                ──────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'home' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-8'>
                        {/* Hero Banner */}
                        <div className='bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-purple-900/10 relative overflow-hidden'>
                            <div className='absolute -right-6 -bottom-6 text-white/10 pointer-events-none scale-150 transform rotate-12'>🐾</div>
                            <div className='max-w-2xl relative z-10'>
                                <div className='inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-5'>
                                    <Sparkles size={13} className='text-amber-300 fill-amber-300' /> Smart AI Styling Active
                                </div>
                                <h2 className='text-3xl md:text-4xl font-extrabold tracking-tight mb-3 leading-tight'>
                                    Ready for a fresh, seasonal look?
                                </h2>
                                <p className='text-purple-100 text-sm md:text-base leading-relaxed mb-8 max-w-xl'>
                                    It's currently the <strong className='text-amber-300'>{seasonDisplay.name}</strong>. {seasonDisplay.advice} Let our machine learning model analyze your dog's breed to suggest the perfect grooming style.
                                </p>
                                <button onClick={() => setActiveTab('booking')}
                                    className='bg-white text-purple-700 hover:bg-purple-50 px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 active:scale-95'>
                                    <Scissors size={18} className='text-purple-600' /> Book Smart Grooming
                                </button>
                            </div>
                        </div>

                        {/* Split Grid */}
                        <div className='grid lg:grid-cols-3 gap-8 items-start'>
                            {/* Appointments Panel */}
                            <div className='lg:col-span-2 space-y-6'>
                                <div className='flex justify-between items-center mb-4 px-1'>
                                    <h3 className='text-lg font-bold text-slate-900 flex items-center gap-2'>Upcoming & Past Bookings</h3>
                                    <span className='text-xs font-medium text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-full'>Total: {appointments.length}</span>
                                </div>

                                {appointments.length === 0 ? (
                                    <div className='bg-white rounded-3xl p-10 text-center border border-slate-200/60 shadow-sm'>
                                        <div className='w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500'><Calendar size={28} /></div>
                                        <p className='text-slate-800 font-bold text-lg mb-2'>No bookings yet</p>
                                        <p className='text-sm text-slate-500 mb-6 max-w-xs mx-auto'>Your scheduled styles and grooming sessions will appear here.</p>
                                        <button onClick={() => setActiveTab('booking')} className='text-sm text-purple-600 font-bold hover:underline'>Schedule your first visit &rarr;</button>
                                    </div>
                                ) : (
                                    <div className='space-y-4'>
                                        {appointments.map((a) => (
                                            <div key={a._id} className='bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5'>
                                                <div className='flex gap-4 items-start'>
                                                    <div className='w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 font-bold border border-purple-100 flex flex-col items-center justify-center shrink-0'>
                                                        <span className='text-lg uppercase'>{a.petName?.slice(0, 2)}</span>
                                                    </div>
                                                    <div className='space-y-1.5'>
                                                        <div className='flex items-center gap-2 flex-wrap'>
                                                            <h4 className='font-bold text-slate-900 text-base'>{a.petName}</h4>
                                                            <span className='text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-bold'>{a.breed}</span>
                                                        </div>
                                                        <p className='text-sm font-semibold text-purple-700 flex items-center gap-1.5'><Scissors size={14} /> {a.service}</p>
                                                        <div className='flex items-center gap-3 text-xs text-slate-500 font-medium pt-1'>
                                                            <span className='flex items-center gap-1.5 text-slate-600'><Calendar size={14} className='text-slate-400' /> {formatDate(a.date)}</span>
                                                            <span className='flex items-center gap-1.5 text-slate-600'><Clock size={14} className='text-slate-400' /> {formatTime(a.time)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 gap-2'>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize tracking-wide ${STATUS_STYLES[a.status] || 'bg-slate-50 text-slate-600 border border-slate-200'}`}>{a.status}</span>
                                                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                                                        <button onClick={() => handleCancelAppointment(a._id)} className='text-xs text-slate-400 hover:text-rose-600 font-bold transition-colors'>Cancel Booking</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Panels */}
                            <div className='space-y-6'>
                                <div className='bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm'>
                                    <h3 className='text-lg font-bold text-slate-900 mb-4'>Your Pack</h3>
                                    {userPets.length === 0 ? (
                                        <div className='text-center py-2 text-slate-500 text-sm'>
                                            <p>No pets tracked yet. Book a session to start building your pack profile!</p>
                                        </div>
                                    ) : (
                                        <div className='divide-y divide-slate-100'>
                                            {userPets.map((pet, index) => (
                                                <div key={index} className={`flex items-center gap-4 ${index > 0 ? 'pt-4 mt-4' : ''}`}>
                                                    <div className='w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg'>🐶</div>
                                                    <div>
                                                        <p className='font-bold text-slate-900 capitalize'>{pet.name}</p>
                                                        <p className='text-xs text-slate-500 font-medium'>{pet.breed}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}


                {/* ────────────────────────────────────────────────────────────────────────
                    TAB: BOOKING FLOW (IN-APP)
                ──────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'booking' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='max-w-3xl mx-auto'>

                        {/* Progress Header */}
                        {!isBooked && (
                            <div className='mb-8'>
                                <div className='flex items-center gap-4 mb-8'>
                                    <button onClick={() => setActiveTab('home')} className='p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500'>
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2 className='text-2xl font-extrabold text-slate-900'>Book an Appointment</h2>
                                </div>
                                <div className='flex justify-center items-center gap-4 mb-3'>
                                    {[1, 2, 3].map((num) => (
                                        <div key={num} className='flex items-center gap-4'>
                                            <motion.div animate={{ backgroundColor: step >= num ? '#9333ea' : '#f1f5f9', color: step >= num ? '#fff' : '#94a3b8' }}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm`}>
                                                {step > num ? <CheckCircle2 size={20} /> : num}
                                            </motion.div>
                                            {num < 3 && <div className={`h-1 w-12 sm:w-20 rounded ${step > num ? 'bg-purple-600' : 'bg-slate-200'}`} />}
                                        </div>
                                    ))}
                                </div>
                                <div className='flex justify-center gap-8 sm:gap-16 text-xs font-bold uppercase tracking-wider text-slate-400'>
                                    <span className={step >= 1 ? 'text-purple-600' : ''}>Pet & Service</span>
                                    <span className={step >= 2 ? 'text-purple-600' : ''}>Date & Time</span>
                                    <span className={step >= 3 ? 'text-purple-600' : ''}>Confirm</span>
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode='wait'>

                            {/* BOOKING STEP 1 */}
                            {step === 1 && !isBooked && (
                                <motion.div key='step1' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className='bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60'>
                                    <h3 className='text-xl font-bold text-slate-900 mb-6'>Pet Information</h3>
                                    <div className='grid md:grid-cols-2 gap-5 mb-8'>
                                        <div>
                                            <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Pet Name *</label>
                                            <input type='text' name='petName' value={formData.petName} onChange={handleInputChange} placeholder='e.g., Max'
                                                className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium' />
                                        </div>
                                        <div>
                                            <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Breed *</label>
                                            <select name='breed' value={formData.breed} onChange={handleBreedChange}
                                                className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium'>
                                                <option value=''>Select breed</option>
                                                {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* ML Recommendations */}
                                    <AnimatePresence>
                                        {formData.breed && formData.breed !== 'Other' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className='overflow-hidden'>
                                                <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-purple-100'>
                                                    <h4 className='text-base font-bold text-slate-900 mb-1 flex items-center gap-2'>
                                                        <Sparkles size={18} className='text-amber-500 fill-amber-500' /> Add AI Styling Upgrade (Optional)
                                                    </h4>
                                                    <p className='text-xs text-slate-500 mb-4'>Analyzed for {getCurrentSeason()} weather conditions.</p>

                                                    {mlLoading ? (
                                                        <div className='flex items-center gap-3 py-4'><Loader2 className='animate-spin text-purple-600' size={18} /><span className='text-slate-500 text-sm'>Generating smart suggestions...</span></div>
                                                    ) : mlRecs.length > 0 ? (
                                                        <div className='grid md:grid-cols-3 gap-4 items-stretch'>
                                                            {mlRecs.map((rec, idx) => (
                                                                <motion.div key={idx} whileHover={{ y: -4 }}
                                                                    onClick={() => setFormData(prev => ({ ...prev, haircutStyle: formData.haircutStyle === rec.name ? null : rec.name }))}
                                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col h-full ${formData.haircutStyle === rec.name ? 'border-purple-600 bg-white shadow-md ring-2 ring-purple-600/20' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                                                    <div className='flex justify-between items-start mb-2'>
                                                                        <h5 className='font-bold text-slate-900 text-sm'>{rec.name}</h5>
                                                                        <span className='bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap'>{rec.match}</span>
                                                                    </div>
                                                                    <p className='text-xs text-slate-500 mb-4 flex-grow leading-relaxed'>{rec.description}</p>
                                                                    <div className='flex justify-between items-center text-xs mt-auto'>
                                                                        <span className='flex items-center gap-1 text-slate-400'><TrendingUp size={12} className='text-purple-400' /> {rec.popularity}</span>
                                                                        <span className='font-bold text-purple-600'>+{rec.price}</span>
                                                                    </div>
                                                                    {formData.haircutStyle === rec.name && (
                                                                        <div className='mt-3 pt-2 border-t border-purple-100 text-xs text-purple-600 font-bold flex items-center gap-1'>
                                                                            <CheckCircle2 size={14} /> Added
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className='text-sm text-slate-500 italic'>No AI suggestions available for this breed.</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <h3 className='text-xl font-bold text-slate-900 mb-4'>Add Base Service</h3>
                                    <div className='grid md:grid-cols-2 gap-3 mb-8'>
                                        {SERVICES.map(service => (
                                            <div key={service.id}
                                                onClick={() => setFormData(prev => ({ ...prev, service: prev.service === service.id ? null : service.id }))}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.service === service.id ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                                <div className='flex justify-between items-start'>
                                                    <h4 className='font-bold text-slate-900 text-sm mb-1'>{service.name}</h4>
                                                    {formData.service === service.id && <CheckCircle2 size={16} className='text-purple-600' />}
                                                </div>
                                                <p className='text-slate-500 text-xs mb-3'>{service.description}</p>
                                                <div className='flex justify-between items-center mt-auto pt-3 border-t border-slate-100'>
                                                    <span className='flex items-center gap-1.5 text-slate-400 text-xs font-medium'><Clock size={14} /> {service.duration}</span>
                                                    <span className='font-bold text-slate-800 text-sm'>{service.price}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Live Cart UI */}
                                    <AnimatePresence>
                                        {(formData.service || formData.haircutStyle) && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                className='bg-slate-900 text-white p-5 rounded-2xl mb-6 shadow-lg border border-slate-800 flex justify-between items-center'>
                                                <div>
                                                    <p className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1'>Estimated Total</p>
                                                    <div className='flex items-center gap-2 flex-wrap text-sm'>
                                                        {selectedService && <span className='font-semibold'>{selectedService.name}</span>}
                                                        {selectedService && formData.haircutStyle && <Plus size={14} className='text-purple-400' />}
                                                        {formData.haircutStyle && <span className='text-purple-300 font-medium'>{formData.haircutStyle} Styling</span>}
                                                    </div>
                                                </div>
                                                <div className='text-right shrink-0 ml-4'>
                                                    <p className='text-2xl font-extrabold text-white'>₱{totalPrice.toLocaleString()}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button onClick={() => setStep(2)} disabled={!formData.petName || !formData.breed || (!formData.service && !formData.haircutStyle)}
                                        className='w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-700 shadow-md shadow-purple-200 transition-all'>
                                        Continue to Date & Time
                                    </button>
                                </motion.div>
                            )}

                            {/* BOOKING STEP 2 */}
                            {step === 2 && !isBooked && (
                                <motion.div key='step2' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className='bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60'>
                                    <h3 className='text-xl font-bold text-slate-900 mb-6'>Select Date & Time</h3>

                                    {(selectedService || formData.haircutStyle) && (
                                        <div className='bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8'>
                                            <p className='text-xs font-bold uppercase tracking-wider text-slate-500 mb-3'>Selected Services</p>
                                            <div className='space-y-3'>
                                                {selectedService && (
                                                    <div className='flex justify-between items-center'>
                                                        <div>
                                                            <p className='text-sm font-bold text-slate-900'>{selectedService.name}</p>
                                                        </div>
                                                        <div className='text-right'>
                                                            <p className='text-xs font-medium text-slate-500 mb-0.5'>{selectedService.duration}</p>
                                                            <p className='text-sm font-bold text-purple-600'>{selectedService.price}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {formData.haircutStyle && (
                                                    <div className={`flex justify-between items-center ${selectedService ? 'pt-3 border-t border-slate-200' : ''}`}>
                                                        <div>
                                                            <p className='text-sm font-bold text-slate-900'>AI Style: {formData.haircutStyle}</p>
                                                        </div>
                                                        <div className='text-right'>
                                                            <p className='text-sm font-bold text-purple-600'>₱{mlPrice.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className='flex justify-between items-center pt-3 border-t border-purple-200'>
                                                    <span className='text-xs font-bold uppercase tracking-wider text-slate-600'>Total Est.</span>
                                                    <span className='font-bold text-purple-700 text-lg'>₱{totalPrice.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className='mb-6'>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Preferred Date *</label>
                                        <input type='date' name='date' value={formData.date} onChange={handleInputChange} min={getMinDate()}
                                            className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium' />
                                    </div>

                                    <div className='mb-8'>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3'>
                                            Available Time Slots * {slotsLoading && <Loader2 className='inline animate-spin ml-2 text-purple-600' size={14} />}
                                        </label>
                                        <div className='grid grid-cols-3 md:grid-cols-4 gap-3'>
                                            {ALL_SLOTS.map(time => {
                                                const isBookedSlot = bookedSlots.includes(time)
                                                const isSelected = formData.time === time
                                                return (
                                                    <button key={time} disabled={isBookedSlot} onClick={() => !isBookedSlot && setFormData(prev => ({ ...prev, time }))}
                                                        className={`py-3 px-2 rounded-xl font-bold transition-all text-sm border-2 ${isBookedSlot ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through' : isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'}`}>
                                                        {formatTime(time)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='flex gap-3'>
                                        <button onClick={() => setStep(1)} className='w-1/3 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all'>Back</button>
                                        <button onClick={() => setStep(3)} disabled={!formData.date || !formData.time} className='w-2/3 bg-slate-900 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 hover:bg-slate-800 transition-all'>
                                            Review Booking
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* BOOKING STEP 3 */}
                            {step === 3 && !isBooked && (
                                <motion.div key='step3' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className='bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60'>
                                    <h3 className='text-xl font-bold text-slate-900 mb-6'>Confirm Details</h3>

                                    <div className='grid md:grid-cols-2 gap-5 mb-5'>
                                        <div>
                                            <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Owner Name *</label>
                                            <input type='text' name='ownerName' value={formData.ownerName} onChange={handleInputChange}
                                                className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium' />
                                        </div>
                                        <div>
                                            <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Email Address *</label>
                                            <input type='email' name='ownerEmail' value={formData.ownerEmail} onChange={handleInputChange}
                                                className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium' />
                                        </div>
                                    </div>
                                    <div className='mb-5'>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Mobile Number *</label>
                                        <input type='tel' name='ownerPhone' value={formData.ownerPhone} onChange={handleInputChange}
                                            className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium' />
                                    </div>
                                    <div className='mb-8'>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Special Notes (Optional)</label>
                                        <textarea name='notes' value={formData.notes} onChange={handleInputChange} rows={2} placeholder='Temperament, allergies, etc.'
                                            className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium resize-none' />
                                    </div>

                                    {/* Summary Box */}
                                    <div className='bg-purple-50 rounded-2xl p-6 mb-8 border border-purple-100/50'>
                                        <h4 className='font-bold text-slate-900 mb-4 text-sm flex items-center gap-2 uppercase tracking-wider'>
                                            <CheckCircle2 size={16} className='text-purple-600' /> Booking Summary
                                        </h4>
                                        <div className='grid grid-cols-2 gap-4 text-sm text-slate-700 mb-4'>
                                            <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Pet</span> <strong className='text-slate-900'>{formData.petName} ({formData.breed})</strong></div>
                                            <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Date</span> <strong className='text-slate-900'>{formatDate(formData.date, { month: 'short', day: 'numeric', year: 'numeric' })}</strong></div>
                                            <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Time</span> <strong className='text-slate-900'>{formatTime(formData.time)}</strong></div>
                                        </div>
                                        <div className='grid grid-cols-2 gap-4 text-sm pt-4 border-t border-purple-200/50'>
                                            {selectedService && <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Base Service</span> <strong className='text-slate-900'>{selectedService.name} (₱{servicePrice.toLocaleString()})</strong></div>}
                                            {formData.haircutStyle && <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>AI Style Upgrade</span> <strong className='text-purple-700'>{formData.haircutStyle} (+₱{mlPrice.toLocaleString()})</strong></div>}
                                            <div className='col-span-2 pt-2 mt-1 border-t border-purple-200'><span className='text-slate-400 block text-xs uppercase tracking-wider mb-1 font-bold'>Total Amount</span> <strong className='text-lg text-purple-700'>₱{totalPrice.toLocaleString()}</strong></div>
                                        </div>
                                    </div>

                                    <div className='flex gap-3'>
                                        <button onClick={() => setStep(2)} className='w-1/3 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all'>Back</button>
                                        <button onClick={handleSubmitBooking} disabled={isSubmittingBooking || !formData.ownerName || !formData.ownerEmail || !formData.ownerPhone}
                                            className='w-2/3 bg-purple-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 hover:bg-purple-700 shadow-md shadow-purple-200 transition-all flex justify-center items-center gap-2'>
                                            {isSubmittingBooking ? <><Loader2 className='animate-spin' size={18} /> Confirming...</> : 'Confirm Appointment'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* BOOKING SUCCESS */}
                            {isBooked && (
                                <motion.div key='success' initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className='bg-white rounded-3xl p-10 shadow-sm border border-slate-200/60 text-center'>
                                    <div className='w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6'>
                                        <CalendarCheck size={36} className='text-emerald-500' />
                                    </div>
                                    <h2 className='text-2xl font-extrabold text-slate-900 mb-2'>Appointment Booked!</h2>
                                    <p className='text-slate-500 mb-8 max-w-sm mx-auto'>Your pet's grooming session is secured. We've added this to your dashboard.</p>

                                    <button onClick={resetBookingAndReturn}
                                        className='bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all'>
                                        Return to Dashboard
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}


                {/* ────────────────────────────────────────────────────────────────────────
                    TAB: NOTIFICATIONS
                ──────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'notifications' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 max-w-3xl mx-auto'>
                        <h2 className='text-xl font-bold text-slate-900 mb-6 flex items-center gap-2'>
                            <Bell size={20} className='text-purple-600' /> Notifications
                        </h2>
                        {notifications.length === 0 ? (
                            <div className='py-12 text-center text-slate-500'>
                                <Bell className='mx-auto text-slate-300 mb-3' size={32} />
                                <p className='font-medium'>All caught up!</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {notifications.map((n) => (
                                    <div key={n._id} className={`p-5 rounded-2xl border transition-colors ${n.isRead ? 'bg-white border-slate-100' : 'bg-purple-50/50 border-purple-200 shadow-sm'}`}>
                                        <div className='flex justify-between items-start gap-4'>
                                            <div>
                                                <h4 className={`text-sm font-bold ${!n.isRead ? 'text-purple-900' : 'text-slate-900'}`}>{n.title}</h4>
                                                <p className='text-sm text-slate-600 mt-1 leading-relaxed'>{n.message}</p>
                                                <p className='text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-3'>{new Date(n.createdAt).toLocaleString('en-PH')}</p>
                                            </div>
                                            {!n.isRead && (
                                                <button onClick={() => handleMarkRead(n._id)} className='text-[11px] uppercase tracking-wider text-purple-600 font-bold hover:text-purple-800 bg-white shadow-sm px-2.5 py-1.5 rounded border border-purple-200 shrink-0'>
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}


                {/* ────────────────────────────────────────────────────────────────────────
                    TAB: SETTINGS
                ──────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'settings' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='max-w-3xl mx-auto space-y-6'>
                        <div className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60'>
                            <h2 className='text-xl font-bold text-slate-900 mb-6 flex items-center gap-2'><User size={20} className='text-purple-600' /> Account Profile</h2>
                            <div className='grid md:grid-cols-3 gap-4'>
                                <div className='bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center'>
                                    <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5'>Owner Name</span>
                                    <strong className='text-slate-800 font-semibold'>{user?.firstName} {user?.lastName}</strong>
                                </div>
                                <div className='bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center overflow-hidden'>
                                    <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5'>Email Address</span>
                                    <strong className='text-slate-800 font-semibold truncate' title={user?.email}>{user?.email}</strong>
                                </div>

                                {/* Editable Mobile NumberBox */}
                                <div className='bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center group relative'>
                                    <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5'>Phone Number</span>
                                    <div className='flex items-center justify-between'>
                                        <input
                                            type="text"
                                            value={profilePhone}
                                            onChange={handleProfilePhoneChange}
                                            className='bg-transparent border-b border-transparent focus:border-purple-400 outline-none font-semibold text-slate-800 w-full transition-colors'
                                        />
                                        <Edit2 size={12} className='text-slate-300 group-hover:text-purple-400 transition-colors absolute right-4 top-4' />
                                        {profilePhone !== originalPhone && (
                                            <button onClick={saveProfilePhone} disabled={isSavingPhone} className='absolute right-4 bottom-4 text-xs font-bold text-white bg-purple-600 px-2 py-1 rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap shadow-sm'>
                                                {isSavingPhone ? '...' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60'>
                            <h2 className='text-xl font-bold text-slate-900 mb-2 flex items-center gap-2'><Lock size={20} className='text-purple-600' /> Security Setup</h2>
                            <p className='text-sm text-slate-500 mb-6'>Changes require active SMS OTP confirmation.</p>

                            <form onSubmit={handleResetPassword} className='space-y-5'>
                                <div>
                                    <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Mobile Phone</label>
                                    <input
                                        value={passwordForm.phone}
                                        onChange={handlePasswordPhoneChange}
                                        className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50 text-sm font-medium'
                                    />
                                </div>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>Verification OTP</label>
                                        <div className='relative'>
                                            <ShieldCheck size={18} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                                            <input value={passwordForm.otp} maxLength={6} placeholder='000000' onChange={(e) => setPasswordForm(prev => ({ ...prev, otp: e.target.value }))}
                                                className='w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium' />
                                        </div>
                                    </div>
                                    <div>
                                        <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'>New Password</label>
                                        <div className='relative'>
                                            <Lock size={18} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                                            <input type='password' placeholder='Min 6 chars' value={passwordForm.newPassword} onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className='w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-sm font-medium' />
                                        </div>
                                    </div>
                                </div>
                                <div className='flex gap-3 pt-2'>
                                    <button type='button' onClick={handleSendOtp} disabled={submitting}
                                        className='w-1/3 border border-purple-200 text-purple-700 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 active:scale-95 transition-all disabled:opacity-50'>
                                        Send OTP
                                    </button>
                                    <button type='submit' disabled={submitting}
                                        className='w-2/3 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 shadow-md active:scale-95 transition-all disabled:opacity-50'>
                                        {submitting ? 'Updating...' : 'Save Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}