import { useState, useEffect, useMemo } from 'react'
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

    useEffect(() => {
        if (!formData.breed || formData.breed === 'Other') { setMlRecs([]); return }
        const season = getCurrentSeason()
        setMlLoading(true)
        mlRecommendApi.recommend(formData.breed, season, 3)
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
            const selectedSvc = SERVICES.find(s => s.id === formData.service)
            await appointmentsApi.create({
                ...formData,
                service: selectedSvc?.name
            })
            setIsBooked(true)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedService = SERVICES.find(s => s.id === formData.service)
    const selectedMLRec = mlRecs.find(r => r.name === formData.haircutStyle)

    const parsePrice = (priceStr) => {
        const num = parseInt(priceStr.replace(/[^0-9]/g, ''))
        return isNaN(num) ? 0 : num
    }

    const servicePrice = parsePrice(selectedService?.price || '0')
    const mlPrice = parsePrice(selectedMLRec?.price || '0')
    const totalPrice = servicePrice + mlPrice

    if (isBooked) {
        return (
            <div className='min-h-screen bg-slate-50 font-sans pt-32 pb-20 px-4 flex items-center justify-center'>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='bg-white rounded-3xl p-10 shadow-sm border border-slate-200/60 text-center max-w-md w-full'
                >
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                        className='w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6'>
                        <CalendarCheck size={36} className='text-emerald-500' />
                    </motion.div>
                    <h2 className='text-2xl font-extrabold text-slate-900 mb-2'>Appointment Booked!</h2>
                    <p className='text-slate-500 mb-8 max-w-sm mx-auto'>Your pet's grooming session is secured. We've added this to your dashboard.</p>

                    <div className='bg-purple-50 rounded-2xl p-6 text-left mb-8 border border-purple-100/50 text-sm space-y-3'>
                        <p><strong className="text-slate-700">Pet:</strong> <span className="text-slate-600">{formData.petName} ({formData.breed})</span></p>
                        <p><strong className="text-slate-700">Service:</strong> <span className="text-slate-600">{selectedService?.name}</span></p>
                        {formData.haircutStyle && <p><strong className="text-slate-700">Style:</strong> <span className="text-slate-600">{formData.haircutStyle}</span></p>}
                        <p><strong className="text-slate-700">Date:</strong> <span className="text-slate-600">{formatDate(formData.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                        <p><strong className="text-slate-700">Time:</strong> <span className="text-slate-600">{formatTime(formData.time)}</span></p>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/dashboard')}
                        className='w-full bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all'>
                        Return to Dashboard
                    </motion.button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-slate-50 text-slate-800 font-sans pt-24 pb-20 px-4'>
            <div className='max-w-3xl mx-auto'>

                <div className='mb-8'>
                    <div className='flex items-center gap-4 mb-8'>
                        <button onClick={() => navigate('/dashboard')} className='p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500'>
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

                <AnimatePresence mode='wait'>
                    {/* ── Step 1 ─────────────────────────────────────────────── */}
                    {step === 1 && (
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
                                                <Sparkles size={18} className='text-amber-500 fill-amber-500' /> AI-Recommended Styles for {formData.breed}
                                            </h4>
                                            <p className='text-xs text-slate-500 mb-4'>Analyzed for {getCurrentSeason()} weather conditions.</p>

                                            {mlLoading ? (
                                                <div className='flex items-center gap-3 py-4'><Loader2 className='animate-spin text-purple-600' size={18} /><span className='text-slate-500 text-sm'>Generating smart suggestions...</span></div>
                                            ) : mlRecs.length > 0 ? (
                                                <div className='grid md:grid-cols-3 gap-4 items-stretch'>
                                                    {mlRecs.map((rec, idx) => (
                                                        <motion.div key={idx} whileHover={{ y: -4 }}
                                                            onClick={() => setFormData(prev => ({ ...prev, haircutStyle: formData.haircutStyle === rec.name ? null : rec.name }))}
                                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col h-full ${formData.haircutStyle === rec.name ? 'border-purple-600 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                                            <div className='flex justify-between items-start mb-2'>
                                                                <h5 className='font-bold text-slate-900 text-sm'>{rec.name}</h5>
                                                                <span className='bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap'>{rec.match}</span>
                                                            </div>
                                                            <p className='text-xs text-slate-500 mb-4 flex-grow leading-relaxed'>{rec.description}</p>
                                                            <div className='flex justify-between items-center text-xs mt-auto'>
                                                                <span className='flex items-center gap-1 text-slate-400'><TrendingUp size={12} className='text-purple-400' /> {rec.popularity}</span>
                                                                <span className='font-bold text-purple-600'>{rec.price}</span>
                                                            </div>
                                                            {formData.haircutStyle === rec.name && (
                                                                <div className='mt-3 pt-2 border-t border-purple-100 text-xs text-purple-600 font-bold flex items-center gap-1'>
                                                                    <CheckCircle2 size={14} /> Selected
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className='text-sm text-slate-500 italic'>No AI suggestions available — please select a standard service below.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <h3 className='text-xl font-bold text-slate-900 mb-4'>Select Service</h3>
                            <div className='grid md:grid-cols-2 gap-3 mb-8'>
                                {SERVICES.map(service => (
                                    <div key={service.id} onClick={() => setFormData(prev => ({ ...prev, service: service.id }))}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.service === service.id ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                                        <h4 className='font-bold text-slate-900 text-sm mb-1'>{service.name}</h4>
                                        <p className='text-slate-500 text-xs mb-3'>{service.description}</p>
                                        <div className='flex justify-between items-center mt-auto pt-3 border-t border-slate-100'>
                                            <span className='flex items-center gap-1.5 text-slate-400 text-xs font-medium'><Clock size={14} /> {service.duration}</span>
                                            <span className='font-bold text-slate-800 text-sm'>{service.price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setStep(2)} disabled={!formData.petName || !formData.breed || !formData.service}
                                className='w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all'>
                                Continue to Date & Time
                            </button>
                        </motion.div>
                    )}

                    {/* ── Step 2 ─────────────────────────────────────────────── */}
                    {step === 2 && (
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
                                            <div className='flex justify-between items-center pt-3 border-t border-slate-200'>
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

                    {/* ── Step 3 ─────────────────────────────────────────────── */}
                    {step === 3 && (
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
                                    <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Service</span> <strong className='text-slate-900'>{selectedService?.name}</strong></div>
                                    {formData.haircutStyle && <div className='col-span-2'><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>AI Style Choice</span> <strong className='text-purple-700'>{formData.haircutStyle}</strong></div>}
                                    <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Date</span> <strong className='text-slate-900'>{formatDate(formData.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
                                    <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Time</span> <strong className='text-slate-900'>{formatTime(formData.time)}</strong></div>
                                </div>
                                <div className='grid grid-cols-2 gap-4 text-sm'>
                                    <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>Service Price</span> <strong className='text-slate-900'>₱{servicePrice.toLocaleString()}</strong></div>
                                    {formData.haircutStyle && <div><span className='text-slate-400 block text-xs uppercase tracking-wider mb-0.5'>AI Style Price</span> <strong className='text-slate-900'>₱{mlPrice.toLocaleString()}</strong></div>}
                                    <div className='col-span-2 pt-2 border-t border-purple-200'><span className='text-slate-400 block text-xs uppercase tracking-wider mb-1 font-bold'>Total Amount</span> <strong className='text-lg text-purple-700'>₱{totalPrice.toLocaleString()}</strong></div>
                                </div>
                            </div>

                            <div className='flex gap-3'>
                                <button onClick={() => setStep(2)} className='w-1/3 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all'>← Back</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.ownerName || !formData.ownerEmail || !formData.ownerPhone}
                                    className='w-2/3 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all flex justify-center items-center gap-2'>
                                    {isSubmitting ? <><Loader2 className='animate-spin' size={18} /> Confirming...</> : 'Confirm Appointment'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}