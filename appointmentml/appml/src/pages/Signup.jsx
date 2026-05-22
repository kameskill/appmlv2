import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, Scissors, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/api'

export default function Signup() {
    const navigate = useNavigate()
    const { user, register, sendRegisterOtp } = useAuth()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        password: '', confirmPassword: '', otp: '', agreeTerms: false
    })
    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)
    const [otpSent, setOtpSent] = useState(false)

    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true })
        } else if (user?.role === 'user') {
            navigate('/dashboard', { replace: true })
        }
    }, [user, navigate])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
        if (name === 'password') {
            let s = 0
            if (value.length >= 6) s++
            if (value.length >= 10) s++
            if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++
            if (/[0-9]/.test(value)) s++
            if (/[^a-zA-Z0-9]/.test(value)) s++
            setPasswordStrength(s)
        }
    }

    const validateBaseForm = () => {
        const e = {}
        if (!formData.firstName.trim()) e.firstName = 'First name is required'
        if (!formData.lastName.trim()) e.lastName = 'Last name is required'
        if (!formData.email) e.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Please enter a valid email'
        if (!formData.phone) e.phone = 'Phone number is required'
        if (!formData.password) e.password = 'Password is required'
        else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters'
        if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'
        if (!formData.agreeTerms) e.agreeTerms = 'You must agree to the terms and conditions'
        return e
    }

    const handleSendOtp = async () => {
        const newErrors = validateBaseForm()
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsLoading(true)
        try {
            const { firstName, lastName, email, phone, password } = formData
            await sendRegisterOtp({ firstName, lastName, email, phone, password })
            setOtpSent(true)
            toast.success('OTP sent to your mobile number')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault()
        if (!formData.otp || formData.otp.length !== 6) {
            setErrors(prev => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }))
            return
        }

        setIsLoading(true)
        try {
            const data = await register({
                email: formData.email,
                phone: formData.phone,
                otp: formData.otp
            })
            toast.success(`Welcome to Timmy Tails, ${data.user.firstName}!`)
            navigate('/dashboard')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    const strengthColor = passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-green-500'
    const strengthText = passwordStrength <= 2 ? 'Weak' : passwordStrength === 3 ? 'Good' : 'Strong'

    const inputClass = (field) =>
        `w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-purple-600'}`

    return (
        <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white flex items-center justify-center px-4 pt-20 pb-20'>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className='w-full max-w-md'
            >
                <div className='bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 md:p-10'>
                    <div className='text-center mb-8'>
                        <motion.div whileHover={{ scale: 1.1 }} className='inline-block mb-4'>
                            <div className='w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center'>
                                <Scissors size={28} className='text-white' />
                            </div>
                        </motion.div>
                        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Create Account</h1>
                        <p className='text-gray-600'>Join Timmy Tails with mobile OTP verification</p>
                    </div>

                    {!otpSent ? (
                        <form onSubmit={(e) => e.preventDefault()} className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                {['firstName', 'lastName'].map((field, i) => (
                                    <div key={field}>
                                        <label className='block text-gray-700 font-bold mb-2'>{i === 0 ? 'First Name' : 'Last Name'}</label>
                                        <div className='relative'>
                                            <User className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                                            <input type='text' name={field} value={formData[field]} onChange={handleInputChange}
                                                placeholder={i === 0 ? 'Juan' : 'Dela Cruz'} className={inputClass(field)} />
                                        </div>
                                        {errors[field] && <p className='text-red-500 text-sm mt-1'>{errors[field]}</p>}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className='block text-gray-700 font-bold mb-2'>Email Address</label>
                                <div className='relative'>
                                    <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                                    <input type='email' name='email' value={formData.email} onChange={handleInputChange}
                                        placeholder='your@email.com' className={inputClass('email')} />
                                </div>
                                {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email}</p>}
                            </div>

                            <div>
                                <label className='block text-gray-700 font-bold mb-2'>Phone Number</label>
                                <div className='relative'>
                                    <Phone className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                                    <input type='tel' name='phone' value={formData.phone} onChange={handleInputChange}
                                        placeholder='(+63) 999 999 9999' className={inputClass('phone')} />
                                </div>
                                {errors.phone && <p className='text-red-500 text-sm mt-1'>{errors.phone}</p>}
                            </div>

                            <div>
                                <label className='block text-gray-700 font-bold mb-2'>Password</label>
                                <div className='relative'>
                                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                                    <input type={showPassword ? 'text' : 'password'} name='password' value={formData.password}
                                        onChange={handleInputChange} placeholder='Create a strong password'
                                        className={`${inputClass('password')} pr-12`} />
                                    <button type='button' onClick={() => setShowPassword(!showPassword)}
                                        className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'>
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {formData.password && (
                                    <div className='mt-2'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${(passwordStrength / 5) * 100}%` }}
                                                    className={`h-full ${strengthColor}`} />
                                            </div>
                                            <span className='text-xs font-bold text-gray-600'>{strengthText}</span>
                                        </div>
                                    </div>
                                )}
                                {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password}</p>}
                            </div>

                            <div>
                                <label className='block text-gray-700 font-bold mb-2'>Confirm Password</label>
                                <div className='relative'>
                                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                                    <input type={showConfirmPassword ? 'text' : 'password'} name='confirmPassword'
                                        value={formData.confirmPassword} onChange={handleInputChange}
                                        placeholder='Re-enter your password' className={`${inputClass('confirmPassword')} pr-12`} />
                                    <button type='button' onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'>
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className='text-red-500 text-sm mt-1'>{errors.confirmPassword}</p>}
                                {formData.password && formData.confirmPassword === formData.password && (
                                    <p className='text-green-500 text-sm mt-1 flex items-center gap-1'><CheckCircle size={16} /> Passwords match</p>
                                )}
                            </div>

                            <div className='flex items-start gap-3 pt-2'>
                                <input type='checkbox' name='agreeTerms' checked={formData.agreeTerms}
                                    onChange={handleInputChange} className='w-5 h-5 rounded border-gray-300 mt-1' />
                                <label className='text-gray-600 text-sm'>
                                    I agree to the{' '}
                                    <Link to='#' className='text-purple-600 hover:text-purple-700 font-semibold'>Terms and Conditions</Link>
                                    {' '}and{' '}
                                    <Link to='#' className='text-purple-600 hover:text-purple-700 font-semibold'>Privacy Policy</Link>
                                </label>
                            </div>
                            {errors.agreeTerms && <p className='text-red-500 text-sm'>{errors.agreeTerms}</p>}

                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                type='button' onClick={handleSendOtp} disabled={isLoading}
                                className='w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6'
                            >
                                {isLoading ? 'Sending OTP...' : 'Send OTP'}
                            </motion.button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className='space-y-5'>
                            <div className='bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700'>
                                <p className='font-semibold flex items-center gap-2'><ShieldCheck size={18} /> OTP sent to {formData.phone}</p>
                                <p className='mt-1'>Enter the 6-digit code to complete your account creation.</p>
                            </div>

                            <div>
                                <label className='block text-gray-700 font-bold mb-2'>OTP Code</label>
                                <input
                                    type='text'
                                    name='otp'
                                    value={formData.otp}
                                    onChange={handleInputChange}
                                    maxLength={6}
                                    placeholder='Enter 6-digit OTP'
                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${errors.otp ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-purple-600'}`}
                                />
                                {errors.otp && <p className='text-red-500 text-sm mt-1'>{errors.otp}</p>}
                            </div>

                            <div className='flex gap-3'>
                                <button
                                    type='button'
                                    onClick={handleSendOtp}
                                    disabled={isLoading}
                                    className='flex-1 border-2 border-purple-300 text-purple-700 py-3 rounded-lg font-bold hover:bg-purple-50 transition-all disabled:opacity-50'
                                >
                                    Resend OTP
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    type='submit' disabled={isLoading}
                                    className='flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    {isLoading ? 'Verifying...' : 'Verify & Create'}
                                </motion.button>
                            </div>
                        </form>
                    )}

                    <p className='text-center text-gray-600 mt-6'>
                        Already have an account?{' '}
                        <Link to='/login' className='text-purple-600 hover:text-purple-700 font-bold'>Sign in here</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
