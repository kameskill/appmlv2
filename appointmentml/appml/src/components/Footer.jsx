import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className='bg-gray-900 text-gray-300 pt-16 pb-8'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                {/* Main Footer Content */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-12 mb-12'>
                    {/* Brand Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className='flex flex-col items-start'
                    >
                        <div className='flex items-center gap-3 mb-4'>
                            {/* Consistent Circular Logo */}
                            <div className="w-12 h-12 rounded-full border-2 border-amber-400 overflow-hidden shadow-md flex items-center justify-center bg-[#4a1c52]">
                                <img src='/logo.png' alt='Timmy Tails' className='w-full h-full object-cover' />
                            </div>
                            <span className='text-2xl font-bold text-white'>Timmy Tails</span>
                        </div>
                        <p className='text-gray-400 text-sm leading-relaxed max-w-xs'>
                            Professional pet grooming services with AI-powered haircut recommendations. We care for your furry friends like family.
                        </p>

                        {/* Social Icons */}
                        <div className='flex gap-4 mt-6'>
                            {['Facebook', 'Instagram', 'Twitter'].map((social) => (
                                <motion.a
                                    key={social}
                                    whileHover={{ scale: 1.2, color: '#a855f7' }}
                                    href='#'
                                    className='p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors'
                                    title={social}
                                >
                                    {/* Social SVGs here... */}
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <h3 className='text-lg font-bold text-white mb-6'>Quick Links</h3>
                        <ul className='space-y-3'>
                            {[
                                { label: 'Home', href: '/' },
                                { label: 'Services', href: '/services' },
                                { label: 'Booking', href: '/booking' },
                                { label: 'About', href: '/about' },
                                { label: 'Contact', href: '/contact' }
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        to={link.href}
                                        className='text-gray-400 hover:text-purple-500 transition-colors font-medium text-sm'
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <h3 className='text-lg font-bold text-white mb-6'>Get in Touch</h3>
                        <div className='space-y-4'>
                            <div className='flex items-start gap-3'>
                                <Phone size={20} className='text-purple-500 mt-1 flex-shrink-0' />
                                <div>
                                    <p className='text-sm text-gray-400'>Phone</p>
                                    <a href='tel:+639756692647' className='text-white hover:text-purple-500 transition-colors font-medium'>
                                        (+63) 975-669-2647
                                    </a>
                                </div>
                            </div>
                            <div className='flex items-start gap-3'>
                                <Mail size={20} className='text-purple-500 mt-1 flex-shrink-0' />
                                <div>
                                    <p className='text-sm text-gray-400'>Email</p>
                                    <a href="#NA" className='text-white hover:text-purple-500 transition-colors font-medium'>
                                        NA
                                    </a>
                                </div>
                            </div>
                            <div className='flex items-start gap-3'>
                                <MapPin size={20} className='text-purple-500 mt-1 flex-shrink-0' />
                                <div>
                                    <p className='text-sm text-gray-400'>Address</p>
                                    <p className='text-white font-medium'>
                                        Tangos <br />
                                        Baliuag City, Bulacan, Philippines
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className='border-t border-gray-800 my-8'></div>

                <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
                    <p className='text-gray-500 text-sm'>
                        © {currentYear} Timmy Tails. All rights reserved.
                    </p>
                    <div className='flex gap-6 text-sm'>
                        <Link to='#' className='text-gray-400 hover:text-purple-500 transition-colors'>Privacy Policy</Link>
                        <Link to='#' className='text-gray-400 hover:text-purple-500 transition-colors'>Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}