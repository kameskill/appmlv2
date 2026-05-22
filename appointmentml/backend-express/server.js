require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const connectDB = require('./config/db')

const app = express()

// Connect to MongoDB
connectDB()

// CORS
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000'
]
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}))

// Body parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false }))

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
})

const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many booking requests, please try again later.' }
})

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many messages sent, please try again later.' }
})

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
})

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'))
app.use('/api/appointments', bookingLimiter, apiLimiter, require('./routes/appointments'))
app.use('/api/admin', apiLimiter, require('./routes/admin'))
app.use('/api/contact', contactLimiter, require('./routes/contact'))
app.use('/api/notifications', apiLimiter, require('./routes/notifications'))

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Timmy Tails API is running', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`🐾 Timmy Tails API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})

module.exports = app
