import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  images: [{ type: String }],
  category: { 
    type: String, 
    required: true,
    enum: ['Machine', 'Additional Accessories', 'Convert Packages'] 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Digital', 'Sublimation', 'UV DTF', 'DTF Printing', 'UV Printing'] 
  },
  machineType: { 
    type: String,
    enum: [
      'Digital Printing machine (10feet)',
      'Digital Printing machine (6Feet)',
      'UV DTF Machine',
      'DTF Printing Machine',
      'Sublimation Machine (10feet)',
      'Sublimation Machine (6Feet)',
      'Plotter (T- Digital)',
      'Manual Laminating machine (T- Digital)',
      'Auto Laminating machine (T - Digital)',
      null
    ]
  },
  accessoryType: {
    type: String,
    enum: [
      'Ink (Digital)',
      'Ink (DTF)',
      'Ink (Sublimation)',
      'Ink (UV DTF)',
      'Rings (digital)',
      'Rings Machine (digital)',
      'Powder (DTF)',
      'Head (i3200)',
      'Head (i1600)',
      'Head (xp600)',
      'Head (Tx800)',
      'Captop',
      'Damper (i3200)',
      'Damper (Tx800)',
      null
    ]
  },
  convertPackageType: {
    type: String,
    enum: [
      'i3200 Update Digital & Sublimation',
      'i1600 Update DTF',
      'Tx800 Update Digital & Sublimation',
      'xp600 Update Digital & Sublimation',
      'i3200 UV Update',
      null
    ]
  },
  inkColor: {
    type: String,
    enum: ['C', 'M', 'Y', 'K', null]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update the 'updatedAt' field
productSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Add text index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  type: 'text', 
  category: 'text',
  machineType: 'text',
  accessoryType: 'text',
  convertPackageType: 'text'
});

const productModel = mongoose.models.Product || mongoose.model('Product', productSchema);

export default productModel;
