const express = require("express");
const router = express.Router();
const packageServices = require("../services/packageServices");

// GET all packages
router.get("/", async (req, res) => {
  try {
    const packages = await packageServices.getAllPackages();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET package by id
router.get("/:id", async (req, res) => {
  try {
    const pkg = await packageServices.getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Not found" });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE package
router.post("/", async (req, res) => {
  try {
    const pkg = await packageServices.createPackage(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE package
router.put("/:id", async (req, res) => {
  try {
    const pkg = await packageServices.updatePackage(req.params.id, req.body);
    res.json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE package
router.delete("/:id", async (req, res) => {
  try {
    const result = await packageServices.deletePackage(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
