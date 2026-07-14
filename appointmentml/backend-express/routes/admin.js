const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Appointment = require('../models/Appointment')
const Contact = require('../models/Contact')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { protect, adminOnly } = require('../middleware/auth')

const TERMINAL_STATUSES = ['completed', 'cancelled']
const REVENUE_STATUSES = ['confirmed', 'completed']

const buildStatusNotification = (appointment, status) => {
    const statusLabels = {
        pending: 'Pending Review',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled'
    }
    const title = `Service ${statusLabels[status] || status}`
    const messageMap = {
        pending: `Your booking for ${appointment.service} is now pending review.`,
        confirmed: `Great news! Your ${appointment.service} booking on ${appointment.date} at ${appointment.time} is confirmed.`,
        completed: `Your ${appointment.service} service on ${appointment.date} is marked as completed. Thank you for trusting Timmy Tails!`,
        cancelled: `Your ${appointment.service} booking on ${appointment.date} at ${appointment.time} has been cancelled.`
    }
    return {
        title,
        message: messageMap[status] || `Your booking status has been updated to ${status}.`
    }
}

// All admin routes require auth + admin role
router.use(protect, adminOnly)

// @route   GET /api/admin/stats
// @desc    Dashboard overview statistics
// @access  Admin
router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

        const [
            todayCount,
            totalCustomers,
            confirmedCount,
            pendingCount,
            monthlyAppointments,
            totalRevenue
        ] = await Promise.all([
            Appointment.countDocuments({ date: today, status: { $in: ['pending', 'confirmed'] } }),
            User.countDocuments({ role: 'user' }),
            Appointment.countDocuments({ status: 'confirmed' }),
            Appointment.countDocuments({ status: 'pending' }),
            Appointment.find({
                date: { $gte: firstOfMonth, $lte: lastOfMonth },
                status: { $in: REVENUE_STATUSES }
            }),
            Appointment.aggregate([
                { $match: { status: { $in: REVENUE_STATUSES } } },
                { $group: { _id: null, total: { $sum: '$price' } } }
            ])
        ])

        const monthlyRevenue = monthlyAppointments.reduce((sum, a) => sum + a.price, 0)

        res.json({
            success: true,
            stats: {
                todayAppointments: todayCount,
                totalCustomers,
                confirmedBookings: confirmedCount,
                pendingAppointments: pendingCount,
                monthlyRevenue: `₱${monthlyRevenue.toLocaleString()}`,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/admin/appointments
// @desc    Get all appointments with optional filters
// @access  Admin
router.get('/appointments', async (req, res) => {
    try {
        const { status, date, page = 1, limit = 20 } = req.query
        const query = {}

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
        if (status) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status filter' })
            }
            query.status = String(status)
        }
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'Invalid date format' })
            }
            query.date = String(date)
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1)
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
        const skip = (pageNum - 1) * limitNum
        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('user', 'firstName lastName email'),
            Appointment.countDocuments(query)
        ])

        res.json({
            success: true,
            appointments,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   PATCH /api/admin/appointments/:id/status
// @desc    Update appointment status
// @access  Admin
router.patch('/appointments/:id/status', async (req, res) => {
    const { status } = req.body
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' })
    }

    try {
        const appointment = await Appointment.findById(req.params.id)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }

        if (appointment.status === status) {
            return res.json({ success: true, appointment })
        }

        if (TERMINAL_STATUSES.includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status because this booking is already ${appointment.status}`
            })
        }

        appointment.status = String(status)
        await appointment.save()

        if (appointment.user) {
            const statusNotification = buildStatusNotification(appointment, status)
            await Notification.create({
                ...statusNotification,
                audience: 'user',
                targetUser: appointment.user,
                type: 'appointment-status',
                appointment: appointment._id,
                createdBy: req.user._id
            })
        }

        res.json({ success: true, appointment })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   DELETE /api/admin/appointments/:id
// @desc    Delete appointment permanently
// @access  Admin
router.delete('/appointments/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' })
    }

    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }
        res.json({ success: true, message: 'Appointment deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/admin/analytics
// @desc    Revenue and trend analytics
// @access  Admin
router.get('/analytics', async (req, res) => {
    try {
        // Last 6 months revenue
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            months.push({
                year: d.getFullYear(),
                month: d.getMonth(),
                label: d.toLocaleString('default', { month: 'short' })
            })
        }

        const monthlyData = await Promise.all(
            months.map(async ({ year, month, label }) => {
                const first = new Date(year, month, 1).toISOString().split('T')[0]
                const last = new Date(year, month + 1, 0).toISOString().split('T')[0]
                const appointments = await Appointment.find({
                    date: { $gte: first, $lte: last },
                    status: { $in: REVENUE_STATUSES }
                })
                return {
                    month: label,
                    monthIndex: month,
                    year,
                    revenue: appointments.reduce((s, a) => s + a.price, 0),
                    appointments: appointments.length
                }
            })
        )

        const dailyRevenueWindow = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            dailyRevenueWindow.push(d.toISOString().split('T')[0])
        }
        const dailyRevenueRaw = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: dailyRevenueWindow[0], $lte: dailyRevenueWindow[dailyRevenueWindow.length - 1] },
                    status: { $in: REVENUE_STATUSES }
                }
            },
            { $group: { _id: '$date', revenue: { $sum: '$price' }, bookings: { $sum: 1 } } }
        ])
        const dailyRevenueMap = dailyRevenueRaw.reduce((acc, item) => {
            acc[item._id] = { revenue: item.revenue, bookings: item.bookings }
            return acc
        }, {})
        const dailyRevenue = dailyRevenueWindow.map((iso) => {
            const metrics = dailyRevenueMap[iso] || { revenue: 0, bookings: 0 }
            return {
                date: iso,
                day: new Date(`${iso}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' }),
                revenue: metrics.revenue,
                bookings: metrics.bookings
            }
        })

        // Service distribution
        const serviceAgg = await Appointment.aggregate([
            { $match: { status: { $nin: ['cancelled'] } } },
            { $group: { _id: '$service', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ])

        // Breed trends
        const breedAgg = await Appointment.aggregate([
            { $match: { status: { $nin: ['cancelled'] }, haircutStyle: { $ne: null } } },
            { $group: { _id: { breed: '$breed', haircut: '$haircutStyle' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])

        const totalApps = serviceAgg.reduce((s, a) => s + a.count, 0) || 1
        const serviceDistribution = serviceAgg.map(s => ({
            name: s._id,
            percentage: Math.round((s.count / totalApps) * 100)
        }))

        const trendingData = breedAgg.map(b => ({
            breed: b._id.breed,
            haircut: b._id.haircut,
            bookings: b.count,
            trend: Math.min(99, 70 + b.count)
        }))

        const recentMonths = monthlyData.slice(-3)
        const monthGrowth = recentMonths.length > 1
            ? recentMonths.slice(1).map((item, idx) => item.revenue - recentMonths[idx].revenue)
            : []
        const avgGrowth = monthGrowth.length
            ? monthGrowth.reduce((sum, value) => sum + value, 0) / monthGrowth.length
            : 0
        const lastMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0
        const predictedRevenue = Math.max(0, Math.round(lastMonthRevenue + avgGrowth))
        const nextMonthDate = new Date()
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
        const nextMonthPrediction = {
            month: nextMonthDate.toLocaleString('default', { month: 'short' }),
            predictedRevenue,
            growthDelta: Math.round(avgGrowth),
            confidence: Math.max(55, Math.min(92, 70 + monthGrowth.length * 8)),
            signal: avgGrowth >= 0 ? 'uptrend' : 'cooldown'
        }

        const currentMonth = new Date().getMonth()
        const isPhilippinesRainySeason = currentMonth >= 5 && currentMonth <= 10
        const weatherInsights = {
            region: 'Philippines',
            seasonType: isPhilippinesRainySeason ? 'Rainy' : 'Dry',
            guidance: isPhilippinesRainySeason
                ? 'Prioritize easy-maintenance trims and anti-matting services for humid and rainy days.'
                : 'Promote lightweight cooling styles and de-shedding services for warm, dry conditions.'
        }

        const mlSuggestions = [
            {
                title: 'Weather-aligned Campaign',
                detail: isPhilippinesRainySeason
                    ? 'Promote shorter maintenance trims this rainy season to reduce matting.'
                    : 'Highlight cooling cuts and hydration add-ons for dry season comfort.'
            },
            {
                title: 'Next Month Sales Target',
                detail: `Projected revenue for ${nextMonthPrediction.month} is ₱${nextMonthPrediction.predictedRevenue.toLocaleString()}.`
            },
            {
                title: 'Top Breed Opportunity',
                detail: trendingData[0]
                    ? `${trendingData[0].breed} owners are leaning toward ${trendingData[0].haircut}; consider a featured bundle.`
                    : 'Collect more confirmed appointments to unlock stronger breed-level insights.'
            }
        ]

        res.json({
            success: true,
            analytics: {
                monthlyData,
                dailyRevenue,
                nextMonthPrediction,
                weatherInsights,
                mlSuggestions,
                serviceDistribution,
                trendingData
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/admin/contacts
// @desc    Get all contact messages
// @access  Admin
router.get('/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 }).limit(50)
        res.json({ success: true, contacts })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/admin/notifications
// @desc    Get admin-created notifications
// @access  Admin
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('createdBy', 'firstName lastName email')

        res.json({ success: true, notifications })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   POST /api/admin/notifications
// @desc    Send notification to users
// @access  Admin
router.post('/notifications', async (req, res) => {
    const { title, message } = req.body

    if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' })
    }
    if (!message || !String(message).trim()) {
        return res.status(400).json({ success: false, message: 'Message is required' })
    }

    try {
        const notification = await Notification.create({
            title: String(title).trim(),
            message: String(message).trim(),
            audience: 'all-users',
            type: 'broadcast',
            createdBy: req.user._id
        })

        res.status(201).json({ success: true, message: 'Notification sent to users', notification })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router
