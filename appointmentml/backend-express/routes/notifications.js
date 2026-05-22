const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')
const USER_NOTIFICATION_LIMIT = 50

// @route   GET /api/notifications
// @desc    Get notifications for logged-in users
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ audience: 'all-users' })
            .sort({ createdAt: -1 })
            .limit(USER_NOTIFICATION_LIMIT)

        const userId = req.user._id.toString()
        const items = notifications.map((n) => ({
            _id: n._id,
            title: n.title,
            message: n.message,
            audience: n.audience,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            isRead: n.readBy.some((id) => id.toString() === userId)
        }))

        res.json({ success: true, notifications: items })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID' })
    }

    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: req.user._id } },
            { new: true }
        )

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' })
        }

        res.json({ success: true, message: 'Notification marked as read' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router
