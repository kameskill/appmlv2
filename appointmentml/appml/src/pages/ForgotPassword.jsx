import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Smartphone, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/api'

export default function ForgotPassword() {
    const navigate = useNavigate()
    const { user, sendPasswordOtp, resetPasswordWithOtp } = useAuth()
    const [formData, setFormData] = useState({ phone: '', otp: '', newPassword: '' })
    const [otpSent, setOtpSent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true })
        } else if (user?.role === 'user') {
            navigate('/dashboard', { replace: true })
        }
    }, [user, navigate])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSendOtp = async () => {
        if (!formData.phone.trim()) {
            toast.error('Mobile number is required')
            return
        }

        setIsLoading(true)
        try {
            await sendPasswordOtp(formData.phone)
            setOtpSent(true)
            toast.success('OTP sent to your mobile number')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = async (e) => {
        e.preventDefault()
        if (!formData.otp || formData.otp.length !== 6) {
            toast.error('Enter a valid 6-digit OTP')
            return
        }
        if (!formData.newPassword || formData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setIsLoading(true)
        try {
            await resetPasswordWithOtp({
                phone: formData.phone,
                otp: formData.otp,
                newPassword: formData.newPassword
            })
            toast.success('Password changed successfully. Please login.')
            navigate('/login')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-white via-purple-50 to-white flex items-center justify-center px-4 pt-20'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md'>
                <div className='bg-white rounded-2xl shadow-2xl border border-gray-100 p-8'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>Reset Password</h1>
                    <p className='text-gray-600 mb-6'>Use mobile OTP to change your password</p>

                    <form onSubmit={handleReset} className='space-y-4'>
                        <div>
                            <label className='block text-gray-700 font-bold mb-2'>Mobile Number</label>
                            <div className='relative'>
                                <Smartphone className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
                                <input name='phone' value={formData.phone} onChange={handleChange} placeholder='(+63) 999 999 9999'
                                    className='w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                            </div>
                        </div>

                        {otpSent && (
                            <>
                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>OTP</label>
                                    <div className='relative'>
                                        <ShieldCheck className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
                                        <input name='otp' value={formData.otp} onChange={handleChange} maxLength={6} placeholder='6-digit OTP'
                                            className='w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                                    </div>
                                </div>

                                <div>
                                    <label className='block text-gray-700 font-bold mb-2'>New Password</label>
                                    <div className='relative'>
                                        <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
                                        <input type='password' name='newPassword' value={formData.newPassword} onChange={handleChange}
                                            placeholder='Minimum 6 characters'
                                            className='w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-600' />
                                    </div>
                                </div>
                            </>
                        )}

                        {!otpSent ? (
                            <button type='button' onClick={handleSendOtp} disabled={isLoading}
                                className='w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-50'>
                                {isLoading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        ) : (
                            <div className='flex gap-3'>
                                <button type='button' onClick={handleSendOtp} disabled={isLoading}
                                    className='flex-1 border-2 border-purple-300 text-purple-700 py-3 rounded-lg font-bold hover:bg-purple-50'>
                                    Resend OTP
                                </button>
                                <button type='submit' disabled={isLoading}
                                    className='flex-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg font-bold disabled:opacity-50'>
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        )}
                    </form>

                    <p className='text-center text-gray-600 mt-6'>
                        Back to <Link to='/login' className='text-purple-600 font-bold'>Login</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
