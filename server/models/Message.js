import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  room: { type: String, index: true, required: true },
  name: { type: String, required: true },
  message: { type: String, required: true },
  ts: { type: Date, default: Date.now }
}, { timestamps: false });

export default mongoose.model('Message', MessageSchema);
