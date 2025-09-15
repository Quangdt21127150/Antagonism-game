const ShopPackage = require("../models/ShopPackage");

const getAllPackages = async () => {
  return await ShopPackage.findAll({ order: [["order_index", "ASC"]] });
};

const getPackageById = async (id) => {
  return await ShopPackage.findByPk(id);
};

const createPackage = async (data) => {
  return await ShopPackage.create(data);
};

const updatePackage = async (id, data) => {
  const pkg = await ShopPackage.findByPk(id);
  if (!pkg) throw new Error("Package not found");
  await pkg.update(data);
  return pkg;
};

const deletePackage = async (id) => {
  const pkg = await ShopPackage.findByPk(id);
  if (!pkg) throw new Error("Package not found");
  await pkg.destroy();
  return { message: "Deleted successfully" };
};

module.exports = {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
};
