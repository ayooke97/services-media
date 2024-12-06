const express = require("express");
const router = express.Router();
const isBase64 = require("is-base64");
const base64Img = require("base64-img");
const path = require("path");
const fs = require("fs");

const { Media } = require("../models");

// Rute untuk mendapatkan semua media
router.get("/", async (req, res) => {
  // Mengambil semua entri media dari database
  const media = await Media.findAll({
    attributes: ["id", "image"],
  });

  const mappedMedia = media.map((m) => {
    // Menambahkan http:// dan host ke URL gambar
    m.image = `http://${req.get("host")}/${m.image}`;
    return m; // Mengembalikan objek media yang telah dimodifikasi
  });

  // Mengembalikan respons JSON dengan status dan data media
  return res.json({
    status: "success",
    data: mappedMedia,
  });
});

// Rute untuk meng-upload media baru
router.post("/", async (req, res) => {
  const image = req.body.image; // Mengambil gambar dari body permintaan

  // Memeriksa apakah string adalah base64 yang valid
  if (!isBase64(image, { mimeRequired: true })) {
    return res.status(400).json({ status: "error", message: "Invalid base64" });
  }

  // Menyimpan gambar dari string base64 ke folder public/images
  base64Img.img(image, "./public/images", Date.now(), async (err, filepath) => {
    if (err) {
      // Jika terjadi kesalahan saat menyimpan gambar, kembalikan kesalahan
      return res.status(400).json({ status: "error", message: err.message });
    }

    // Mendapatkan nama file dari path yang disimpan
    const filename = filepath.split("\\").pop().split("/").pop();
    console.log(`Image saved at: ${filepath}`); // Log path file yang disimpan

    try {
      // Menyimpan informasi media ke database
      const media = await Media.create({ image: `images/${filename}` });
      // Mengembalikan respons sukses dengan data media yang baru disimpan
      return res.json({
        status: "success",
        data: {
          id: media.id, // ID media yang baru disimpan
          image: `http://${req.get("host")}/images/${filename}`, // URL gambar lengkap
        },
      });
    } catch (error) {
      // Jika terjadi kesalahan saat menyimpan ke database, kembalikan kesalahan
      return res
        .status(500)
        .json({ status: "error", message: "Failed to save media" });
    }
  });
});

router.delete("/:id", async (req, res) => {
  // Mengambil ID dari parameter URL
  const id = req.params.id;

  // Mencari entri media berdasarkan ID
  const media = await Media.findByPk(id);

  // Mengecek apakah media ditemukan
  if (!media) {
    // Jika tidak ditemukan, mengembalikan response 404
    return res
      .status(404)
      .json({ status: "error", message: "Media not found" });
  }

  // Menghapus file gambar yang terkait dengan media
  fs.unlink(`public/${media.image}`, async (err) => {
    // Menghapus tanda koma di depan path
    if (err) {
      // Jika terjadi kesalahan saat menghapus file, mengembalikan response 400
      return res.status(400).json({ status: "error", message: err.message });
    }

    // Menghapus entri media dari database
    await media.destroy();

    // Mengembalikan response sukses jika penghapusan berhasil
    return res.json({
      status: "success",
      message: "Image deleted successfully",
    });
  });
});
module.exports = router;
