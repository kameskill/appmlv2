const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const { body, validationResult } = require('express-validator')
const Appointment = require('../models/Appointment')
const Service = require('../models/Service')
const { protect, optionalProtect } = require('../middleware/auth')

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Public (guests can also book)
router.post(
    '/',
    optionalProtect,
    [
        body('petName').notEmpty().trim().withMessage('Pet name is required'),
        body('breed').notEmpty().trim().withMessage('Breed is required'),
        body('service').notEmpty().withMessage('Service is required'),
        body('date').notEmpty().withMessage('Date is required'),
        body('time').notEmpty().withMessage('Time is required'),
        body('ownerName').notEmpty().trim().withMessage('Owner name is required'),
        body('ownerEmail').isEmail().normalizeEmail().withMessage('Valid owner email is required'),
        body('ownerPhone').notEmpty().trim().withMessage('Owner phone is required')
    ],
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() })
        }

        const { petName, breed, haircutStyle, service, date, time, ownerName, ownerEmail, ownerPhone, notes } = req.body

        try {
            // Check if time slot is already booked for that date
            const existing = await Appointment.findOne({
                date: String(date),
                time: String(time),
                status: { $in: ['pending', 'confirmed'] }
            })
            if (existing) {
                return res.status(400).json({ success: false, message: 'This time slot is already booked. Please choose another time.' })
            }

            let price = 0;
            const serviceData = await Service.findOne({ name: service });
            if (serviceData) {
                price = serviceData.price;
            } else {
                const SERVICE_PRICES = {
                    'Full Grooming Package': 1200,
                    'Bath & Brush': 600,
                    'Haircut Special': 900,
                    'Quick Trim': 400,
                    'Teeth Cleaning': 500,
                    'De-shedding Treatment': 700
                }
                price = SERVICE_PRICES[service] || 0;
            }

            const appointment = await Appointment.create({
                user: req.user ? req.user._id : null,
                petName,
                breed,
                haircutStyle: haircutStyle || null,
                service,
                date,
                time,
                ownerName,
                ownerEmail,
                ownerPhone,
                notes: notes || '',
                price: price
            })

            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully! We will confirm your booking shortly.',
                appointment
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ success: false, message: 'Server error' })
        }
    }
)

// @route   GET /api/appointments/availability
// @desc    Get booked time slots for a given date
// @access  Public
router.get('/availability', async (req, res) => {
    const { date } = req.query
    if (!date) {
        return res.status(400).json({ success: false, message: 'Date query parameter is required' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Invalid date format' })
    }

    try {
        const bookedSlots = await Appointment.find(
            { date: String(date), status: { $in: ['pending', 'confirmed'] } },
            { time: 1, _id: 0 }
        )

        res.json({
            success: true,
            bookedTimes: bookedSlots.map(a => a.time)
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   GET /api/appointments/my
// @desc    Get current user's appointments
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user._id })
            .sort({ date: -1, time: -1 })

        res.json({ success: true, appointments })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   DELETE /api/appointments/:id
// @desc    Cancel an appointment (owner or admin)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' })
    }
    try {
        const appointment = await Appointment.findById(req.params.id)
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' })
        }

        const isOwner = appointment.user && appointment.user.toString() === req.user._id.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' })
        }

        appointment.status = 'cancelled'
        await appointment.save()

        res.json({ success: true, message: 'Appointment cancelled' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router
