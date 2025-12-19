import Product from "../models/productmodel.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/products";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "product-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Get all products with optional filtering
const getallproducts = async (req, res) => {
  try {
    const { 
      category, 
      type, 
      machineType, 
      accessoryType, 
      convertPackageType,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter criteria
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (machineType) filter.machineType = machineType;
    if (accessoryType) filter.accessoryType = accessoryType;
    if (convertPackageType) filter.convertPackageType = convertPackageType;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Sort options
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Execute query
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    
    // Return empty array instead of 404 error when no products are found
    res.status(200).json({ 
      products: products || [],
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(200).json({ products: [] });
    }
    
    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });
    
    // Return empty array instead of 404 error when no products are found
    res.status(200).json({ products: products || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add new product with multiple images
const addProduct = async (req, res) => {
  // Use multer array for multiple images
  upload.array("images", 5)(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { 
        name, 
        price, 
        discount, 
        description, 
        quantity, 
        category, 
        type, 
        machineType, 
        accessoryType, 
        convertPackageType,
        inkColor 
      } = req.body;

      // Process uploaded images
      const images = req.files ? 
        req.files.map(file => file.path.replace(/\\/g, "/")) : 
        [];

      // Create new product
      const product = new Product({ 
        name, 
        price, 
        discount: discount || 0, 
        description, 
        quantity, 
        images,
        category, 
        type,
        machineType: machineType || null,
        accessoryType: accessoryType || null,
        convertPackageType: convertPackageType || null,
        inkColor: inkColor || null
      });
      
      await product.save();
      res.status(201).json({ product });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Unable to add product", error: error.message });
    }
  });
};

// Get product by ID
const getProductById = async (req, res) => {
  const id = req.params.id;
  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update product
const updateProduct = async (req, res) => {
  upload.array("images", 5)(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const id = req.params.id;
    
    try {
      const existingProduct = await Product.findById(id);
      if (!existingProduct) return res.status(404).json({ message: "Product not found" });

      // Prepare update data
      const { 
        name, 
        price, 
        discount, 
        description, 
        quantity, 
        category, 
        type, 
        machineType, 
        accessoryType, 
        convertPackageType,
        inkColor,
        deleteImages
      } = req.body;

      const updateData = { 
        name, 
        price, 
        discount, 
        description, 
        quantity, 
        category, 
        type,
        updatedAt: Date.now()
      };

      // Only update these fields if they're provided
      if (machineType !== undefined) updateData.machineType = machineType || null;
      if (accessoryType !== undefined) updateData.accessoryType = accessoryType || null;
      if (convertPackageType !== undefined) updateData.convertPackageType = convertPackageType || null;
      if (inkColor !== undefined) updateData.inkColor = inkColor || null;

      // Handle image updates
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path.replace(/\\/g, "/"));
        
        // If deleteImages flag is true, replace all images
        if (deleteImages === 'true') {
          // Delete old image files
          existingProduct.images.forEach(imagePath => {
            const fullPath = path.join(__dirname, "..", imagePath);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
          });
          updateData.images = newImages;
        } else {
          // Add new images to existing ones
          updateData.images = [...existingProduct.images, ...newImages];
        }
      }
      
      // Handle specific image deletions
      if (deleteImages && deleteImages !== 'true' && deleteImages !== 'false') {
        // deleteImages contains comma-separated indices to delete
        const indicesToDelete = deleteImages.split(',').map(idx => Number(idx));
        
        // Get images to delete
        const imagesToDelete = indicesToDelete.map(index => existingProduct.images[index]).filter(Boolean);
        
        // Delete the files
        imagesToDelete.forEach(imagePath => {
          const fullPath = path.join(__dirname, "..", imagePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        });
        
        // Filter out deleted images
        updateData.images = existingProduct.images.filter((_, idx) => !indicesToDelete.includes(idx));
      }

      const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Unable to update product", error: err.message });
    }
  });
};

// Delete product
const deleteProduct = async (req, res) => {
  const id = req.params.id;
  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete all associated images
    if (product.images && product.images.length > 0) {
      product.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, "..", imagePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to delete product" });
  }
};

// Get product categories, types, and other filter options
const getFilterOptions = async (req, res) => {
  try {
    // Get unique values for each filter field
    const categories = await Product.distinct('category');
    const types = await Product.distinct('type');
    const machineTypes = await Product.distinct('machineType');
    const accessoryTypes = await Product.distinct('accessoryType');
    const convertPackageTypes = await Product.distinct('convertPackageType');
    
    res.status(200).json({
      categories,
      types,
      machineTypes: machineTypes.filter(Boolean),
      accessoryTypes: accessoryTypes.filter(Boolean),
      convertPackageTypes: convertPackageTypes.filter(Boolean)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Export all products
const exportProducts = async (req, res) => {
  try {
    // No pagination - get all products
    const products = await Product.find({}).lean();
    
    // Return all products
    res.status(200).json({ 
      products,
      count: products.length
    });
  } catch (err) {
    console.error("Error exporting products:", err);
    res.status(500).json({ message: "Failed to export products" });
  }
};

export {
  getallproducts,
  addProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFilterOptions,
  exportProducts
};
