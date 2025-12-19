import express from 'express';
import { 
  getallproducts, 
  addProduct, 
  getProductById, 
  updateProduct, 
  deleteProduct, 
  searchProducts,
  getFilterOptions,
  exportProducts 
} from '../controllers/productcontrollers.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes (accessible by all users)
router.get("/", getallproducts);
router.get("/search", searchProducts);
router.get("/filters", getFilterOptions);
router.get("/:id", getProductById);

// Protected routes (admin only)
router.get("/export/all", isAdmin, exportProducts);
router.post("/", isAdmin, addProduct);
router.put("/:id", isAdmin, updateProduct);
router.delete("/:id", isAdmin, deleteProduct);

export default router;

