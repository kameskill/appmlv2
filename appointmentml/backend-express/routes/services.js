const express = require('express')
const router = express.Router()
const Service = require('../models/Service')
const { protect, adminOnly } = require('../middleware/auth')

// Initial default services
const defaultServices = [
    { id: 1, name: 'Full Grooming Package', description: 'Complete grooming with bath, haircut, nail trim, and ear cleaning', duration: '120 min', price: 1200 },
    { id: 2, name: 'Bath & Brush', description: 'Relaxing bath with premium shampoo and thorough brushing', duration: '60 min', price: 600 },
    { id: 3, name: 'Haircut Special', description: 'Professional haircut with breed-specific styling', duration: '90 min', price: 900 },
    { id: 4, name: 'Quick Trim', description: 'Fast maintenance service for nails, paws, and sanitary trimming', duration: '30 min', price: 400 },
    { id: 5, name: 'Teeth Cleaning', description: 'Professional dental cleaning and breath freshening', duration: '45 min', price: 500 },
    { id: 6, name: 'De-shedding Treatment', description: 'Special treatment to reduce shedding and promote healthy coat', duration: '75 min', price: 700 }
]

// @route   GET /api/services
// @desc    Get all services
// @access  Public
router.get('/', async (req, res) => {
    try {
        let services = await Service.find().sort({ id: 1 })
        
        if (services.length === 0) {
            // Seed default services
            services = await Service.insertMany(defaultServices)
        }
        
        res.json({ success: true, services })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   PUT /api/services/:id
// @desc    Update a service (e.g. price)
// @access  Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const { price } = req.body
        const serviceId = parseInt(req.params.id)
        
        const service = await Service.findOneAndUpdate(
            { id: serviceId },
            { price: Number(price) },
            { new: true }
        )
        
        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' })
        }
        
        res.json({ success: true, service })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router
