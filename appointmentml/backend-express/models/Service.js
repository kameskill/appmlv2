const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('Service', serviceSchema)
