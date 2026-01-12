import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  type: { type: String, enum: ['open', 'protected'], required: true },
  password: { type: String, default: null } // keep simple for project; hash later if you like
}, { timestamps: true });

export default mongoose.model('Room', RoomSchema);
