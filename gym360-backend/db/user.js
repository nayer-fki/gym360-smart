const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'coach', 'admin'], default: 'client' },
  image: { type: String }, // URL ou chemin local
  profileInfo: {
    age: Number,
    weight: Number,
    gender: String
  }
});

module.exports = mongoose.model('User', userSchema);
