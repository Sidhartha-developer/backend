import ScrapCategory from "../models/ScrapCategory.js";
import { success, error } from "../utils/response.utils.js";

export const getAllCategories = async (_req, res) => {
  try {
    const categories = await ScrapCategory.find({ isActive: true }).sort({ name: 1 });
    return success(res, { categories });
  } catch (err) {
    return error(res, err.message);
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, iconUrl } = req.body;

    if (!name) return error(res, "Category name is required", 400);

    const exists = await ScrapCategory.findOne({ name: name.trim() });
    if (exists) return error(res, "Category with this name already exists", 409);

    const category = await ScrapCategory.create({ name: name.trim(), description, iconUrl });

    return success(res, { category }, "Category created", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description, iconUrl, isActive } = req.body;

    if (!name && !description && iconUrl === undefined && isActive === undefined) {
      return error(res, "Provide at least one field to update", 400);
    }

    const update = {};
    if (name)             update.name        = name.trim();
    if (description)      update.description = description;
    if (iconUrl !== undefined) update.iconUrl = iconUrl;
    if (isActive !== undefined) update.isActive = isActive;

    const category = await ScrapCategory.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!category) return error(res, "Category not found", 404);

    return success(res, { category }, "Category updated");
  } catch (err) {
    return error(res, err.message);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await ScrapCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) return error(res, "Category not found", 404);

    return success(res, {}, "Category deleted");
  } catch (err) {
    return error(res, err.message);
  }
};
