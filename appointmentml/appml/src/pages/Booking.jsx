import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, Sparkles, Loader2, CheckCircle2, CalendarCheck, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { appointmentsApi, mlRecommendApi, getErrorMessage } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useAdminRedirect } from '../utils/useAdminRedirect'
import { formatTime } from '../utils/formatters'

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

const formatDate = (date, options) =>
    date ? new Date(date + 'T12:00:00').toLocaleDateString('en-PH', options) : ''

export default function Booking() {
    const navigate = useNavigate()
    const { user } = useAuth()
    useAdminRedirect()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isBooked, setIsBooked] = useState(false)

    const [formData, setFormData] = useState({
        petName: '', breed: '', haircutStyle: null, service: null,
        date: '', time: '', ownerName: '', ownerEmail: '', ownerPhone: '', notes: ''
    })

    const [mlRecs, setMlRecs] = useState([])
    const [mlLoading, setMlLoading] = useState(false)
    const [bookedSlots, setBookedSlots] = useState([])
    const [slotsLoading, setSlotsLoading] = useState(false)

    // Pre-fill owner info from auth context
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                ownerName: `${user.firstName} ${user.lastName}`,
                ownerEmail: user.email,
                ownerPhone: user.phone || ''
            }))
        }
    }, [user])

    // Fetch ML recommendations when breed changes
    useEffect(() => {
        if (!formData.breed || formData.breed === 'Other') { setMlRecs([]); return }
        const season = getCurrentSeason()
        setMlLoading(true)
        mlRecommendApi.recommend(formData.breed, season, 3)
            .then(({ data }) => setMlRecs(data.recommendations || []))
            .catch(() => setMlRecs([]))
            .finally(() => setMlLoading(false))
    }, [formData.breed])

    // Fetch booked slots when date changes
    useEffect(() => {
        if (!formData.date) { setBookedSlots([]); return }
        setSlotsLoading(true)
        appointmentsApi.getAvailability(formData.date)
            .then(({ data }) => setBookedSlots(data.bookedTimes || []))
            .catch(() => setBookedSlots([]))
            .finally(() => setSlotsLoading(false))
    }, [formData.date])

    const getCurrentSeason = () => {
        const m = new Date().getMonth() + 1
        if (m >= 3 && m <= 5) return 'spring'
        if (m >= 6 && m <= 8) return 'summer'
        if (m >= 9 && m <= 11) return 'fall'
        return 'winter'
    }

    const getMinDate = () => new Date().toISOString().split('T')[0]

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleBreedChange = (e) => {
        setFormData(prev => ({ ...prev, breed: e.target.value, haircutStyle: null }))
    }

    const handleSubmit = async () => {
        if (!formData.ownerName || !formData.ownerEmail || !formData.ownerPhone) {
            toast.error('Please fill in all contact details')
            return
        }
        setIsSubmitting(true)
        try {
            const selectedService = SERVICES.find(s => s.id === formData.service)
            await appointmentsApi.create({
                ...formData,
                service: selectedService?.name
            })
            setIsBooked(true)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedService = SERVICES.find(s => s.id === formData.service)

    // ── Success Screen ──────────────────────────────────────────────────────
    if (isBooked) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white pt-32 pb-20 px-4 flex items-center justify-center'>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='bg-white rounded-2xl p-10 shadow-2xl border border-gray-100 text-center max-w-md w-full'
                >
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                        className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                        <CalendarCheck size={40} className='text-green-600' />
                    </motion.div>
                    <h2 className='text-3xl font-bold text-gray-900 mb-3'>Booking Confirmed!</h2>
                    <p className='text-gray-600 mb-2'>Your appointment has been submitted.</p>
                    <p className='text-gray-500 text-sm mb-8'>We'll reach out at <strong>{formData.ownerEmail}</strong> to confirm your booking shortly.</p>
                    <div className='bg-purple-50 rounded-xl p-4 text-left mb-6 text-sm space-y-2'>
                        <p><strong>Pet:</strong> {formData.petName} ({formData.breed})</p>
                        <p><strong>Service:</strong> {selectedService?.name}</p>
                        {formData.haircutStyle && <p><strong>Style:</strong> {formData.haircutStyle}</p>}
                        <p><strong>Date:</strong> {formatDate(formData.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>Time:</strong> {formatTime(formData.time)}</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/')}
                        className='w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all'>
                        Back to Home
                    </motion.button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white pt-32 pb-20 px-4'>
            <div className='max-w-4xl mx-auto'>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className='flex items-center gap-4 mb-8'>
                    <button onClick={() => navigate('/')} className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
                        <ArrowLeft size={24} className='text-gray-700' />
                    </button>
                    <div>
                        <img src='/logo.png' alt='Timmy Tails' className='w-10 h-10 rounded-lg object-cover inline-block mr-3' />
                        <h1 className='text-3xl font-bold text-gray-900 inline-block'>Book Appointment</h1>
                    </div>
                </motion.div>

                {/* Progress Steps */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className='flex justify-center items-center gap-6 mb-4'>
                    {[1, 2, 3].map((num) => (
                        <div key={num} className='flex items-center gap-4'>
                            <motion.div
                                animate={{ backgroundColor: step >= num ? '#a855f7' : '#e5e7eb', color: step >= num ? '#fff' : '#6b7280' }}
                                className='w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg relative'
                            >
                                {step > num ? <CheckCircle2 size={24} /> : num}
                            </motion.div>
                            {num < 3 && <div className={`h-1 w-16 rounded ${step > num ? 'bg-purple-600' : 'bg-gray-300'}`} />}
                        </div>
                    ))}
                </motion.div>
                <div className='flex justify-center gap-12 mb-8 text-sm font-medium'>
                    {['Pet & Service', 'Date & Time', 'Confirm'].map((label, i) => (
                        <span key={label} className={step === i + 1 ? 'text-purple-600' : 'text-gray-400'}>{label}</span>
                    ))}
                </div>

                <AnimatePresence mode='wait'>
                    {/* ── Step 1 ─────────────────────────────────────────────── */}
                    {step === 1 && (
                        <motion.div key='step1' initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100'>
                            <h2 className='text-2xl font-bold text-gray-900 mb-6'>Pet Information</h2>

                            <div className='grid md:grid-cols-2 gap-6 mb-8'>
                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>Pet Name *</label>
                                    <input type='text' name='petName' value={formData.petName} onChange={handleInputChange}
                                        placeholder='e.g., Max'
                                        className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 transition-colors' />
                                </div>
                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>Breed *</label>
                                    <select name='breed' value={formData.breed} onChange={handleBreedChange}
                                        className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 transition-colors'>
                                        <option value=''>Select breed</option>
                                        {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* ML Recommendations */}
                            <AnimatePresence>
                                {formData.breed && formData.breed !== 'Other' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-8 border border-purple-200'>
                                        <h3 className='text-lg font-bold text-gray-900 mb-1 flex items-center gap-2'>
                                            <Sparkles size={20} className='text-purple-600' />
                                            AI-Recommended Haircuts for {formData.breed}
                                        </h3>
                                        <p className='text-sm text-gray-500 mb-4'>Based on seasonal trends and breed analysis — {getCurrentSeason()} season</p>

                                        {mlLoading ? (
                                            <div className='flex items-center gap-3 py-4'>
                                                <Loader2 className='animate-spin text-purple-600' size={20} />
                                                <span className='text-gray-600 text-sm'>Fetching ML recommendations...</span>
                                            </div>
                                        ) : mlRecs.length > 0 ? (
                                            <div className='grid md:grid-cols-3 gap-4'>
                                                {mlRecs.map((rec, idx) => (
                                                    <motion.div key={idx} whileHover={{ y: -4 }}
                                                        onClick={() => setFormData(prev => ({ ...prev, haircutStyle: formData.haircutStyle === rec.name ? null : rec.name }))}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.haircutStyle === rec.name ? 'border-purple-600 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                                                        <div className='flex justify-between items-start mb-2'>
                                                            <h4 className='font-bold text-gray-900 text-sm'>{rec.name}</h4>
                                                            <span className='bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap'>{rec.match}</span>
                                                        </div>
                                                        <p className='text-xs text-gray-500 mb-2 line-clamp-2'>{rec.description}</p>
                                                        <div className='flex justify-between items-center text-xs text-gray-500'>
                                                            <span className='flex items-center gap-1'><TrendingUp size={12} className='text-purple-500' /> {rec.popularity}</span>
                                                            <span className='font-bold text-purple-600'>{rec.price}</span>
                                                        </div>
                                                        {formData.haircutStyle === rec.name && (
                                                            <div className='mt-2 text-xs text-purple-600 font-bold flex items-center gap-1'>
                                                                <CheckCircle2 size={14} /> Selected
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='text-sm text-gray-500 italic'>No ML recommendations available — using default styles.</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <h2 className='text-2xl font-bold text-gray-900 mb-4'>Select Service</h2>
                            <div className='grid md:grid-cols-2 gap-4 mb-8'>
                                {SERVICES.map(service => (
                                    <motion.div key={service.id} whileHover={{ y: -3 }}
                                        onClick={() => setFormData(prev => ({ ...prev, service: service.id }))}
                                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${formData.service === service.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                                        <h3 className='font-bold text-gray-900 mb-1'>{service.name}</h3>
                                        <p className='text-gray-500 text-sm mb-3'>{service.description}</p>
                                        <div className='flex justify-between items-center'>
                                            <span className='flex items-center gap-1 text-gray-500 text-sm'><Clock size={14} /> {service.duration}</span>
                                            <span className='font-bold text-purple-600'>{service.price}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <button onClick={() => setStep(2)} disabled={!formData.petName || !formData.breed || !formData.service}
                                className='w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 transition-all'>
                                Continue to Date & Time →
                            </button>
                        </motion.div>
                    )}

                    {/* ── Step 2 ─────────────────────────────────────────────── */}
                    {step === 2 && (
                        <motion.div key='step2' initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100'>
                            <h2 className='text-2xl font-bold text-gray-900 mb-6'>Select Date & Time</h2>

                            <div className='mb-8'>
                                <label className='block text-gray-700 font-bold mb-2'>Preferred Date *</label>
                                <input type='date' name='date' value={formData.date} onChange={handleInputChange} min={getMinDate()}
                                    className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                            </div>

                            <div className='mb-8'>
                                <label className='block text-gray-700 font-bold mb-3'>
                                    Available Time Slots *
                                    {slotsLoading && <Loader2 className='inline animate-spin ml-2 text-purple-600' size={16} />}
                                </label>
                                <div className='grid grid-cols-3 md:grid-cols-4 gap-3'>
                                    {ALL_SLOTS.map(time => {
                                        const isBooked = bookedSlots.includes(time)
                                        const isSelected = formData.time === time
                                        return (
                                            <motion.button key={time} whileHover={!isBooked ? { scale: 1.05 } : {}} whileTap={!isBooked ? { scale: 0.95 } : {}}
                                                disabled={isBooked}
                                                onClick={() => !isBooked && setFormData(prev => ({ ...prev, time }))}
                                                className={`py-3 px-3 rounded-lg font-bold transition-all text-sm ${isBooked ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : isSelected ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700'}`}>
                                                {formatTime(time)}
                                                {isBooked && <span className='block text-xs font-normal'>Booked</span>}
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>

                            {selectedService && (
                                <div className='bg-purple-50 border border-purple-200 rounded-xl p-4 mb-8'>
                                    <p className='text-sm text-gray-700 mb-1'><strong>Service:</strong> {selectedService.name}</p>
                                    <p className='text-sm text-gray-700 mb-1'><strong>Duration:</strong> {selectedService.duration}</p>
                                    <p className='text-sm font-bold text-purple-600'><strong>Price:</strong> {selectedService.price}</p>
                                </div>
                            )}

                            <div className='flex gap-4'>
                                <button onClick={() => setStep(1)} className='flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all'>← Back</button>
                                <button onClick={() => setStep(3)} disabled={!formData.date || !formData.time}
                                    className='flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all'>
                                    Continue →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 3 ─────────────────────────────────────────────── */}
                    {step === 3 && (
                        <motion.div key='step3' initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className='bg-white rounded-2xl p-8 shadow-lg border border-gray-100'>
                            <h2 className='text-2xl font-bold text-gray-900 mb-6'>Confirm & Complete Booking</h2>

                            <div className='grid md:grid-cols-2 gap-6 mb-6'>
                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>Your Name *</label>
                                    <input type='text' name='ownerName' value={formData.ownerName} onChange={handleInputChange}
                                        placeholder='Your full name'
                                        className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                                </div>
                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>Email *</label>
                                    <input type='email' name='ownerEmail' value={formData.ownerEmail} onChange={handleInputChange}
                                        placeholder='your@email.com'
                                        className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                                </div>
                            </div>

                            <div className='mb-6'>
                                <label className='block text-gray-700 font-bold mb-2'>Phone Number *</label>
                                <input type='tel' name='ownerPhone' value={formData.ownerPhone} onChange={handleInputChange}
                                    placeholder='+63 9XX XXX XXXX'
                                    className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                            </div>

                            <div className='mb-6'>
                                <label className='block text-gray-700 font-bold mb-2'>Special Notes (optional)</label>
                                <textarea name='notes' value={formData.notes} onChange={handleInputChange} rows={3}
                                    placeholder='Any special requests or information about your pet...'
                                    className='w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 resize-none' />
                            </div>

                            {/* Summary */}
                            <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-8 border border-purple-100'>
                                <h3 className='font-bold text-gray-900 mb-4 text-lg flex items-center gap-2'>
                                    <CheckCircle2 size={20} className='text-purple-600' />
                                    Booking Summary
                                </h3>
                                <div className='grid grid-cols-2 gap-3 text-sm text-gray-700'>
                                    <div><span className='text-gray-500'>Pet:</span> <strong>{formData.petName}</strong></div>
                                    <div><span className='text-gray-500'>Breed:</span> <strong>{formData.breed}</strong></div>
                                    {formData.haircutStyle && (
                                        <div className='col-span-2'><span className='text-gray-500'>Style:</span> <strong className='text-purple-700'>{formData.haircutStyle}</strong></div>
                                    )}
                                    <div><span className='text-gray-500'>Service:</span> <strong>{selectedService?.name}</strong></div>
                                    <div><span className='text-gray-500'>Date:</span> <strong>{formatDate(formData.date, { month: 'short', day: 'numeric', year: 'numeric' })}</strong></div>
                                    <div><span className='text-gray-500'>Time:</span> <strong>{formatTime(formData.time)}</strong></div>
                                    <div><span className='text-gray-500'>Price:</span> <strong className='text-purple-600'>{selectedService?.price}</strong></div>
                                </div>
                            </div>

                            <div className='flex gap-4'>
                                <button onClick={() => setStep(2)} className='flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all'>← Back</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.ownerName || !formData.ownerEmail || !formData.ownerPhone}
                                    className='flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all'>
                                    {isSubmitting ? (
                                        <span className='flex items-center justify-center gap-2'>
                                            <Loader2 className='animate-spin' size={18} /> Booking...
                                        </span>
                                    ) : 'Confirm Booking'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}