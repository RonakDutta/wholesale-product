const express = require("express");
const path = require("path");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const profileRoutes = require("./routes/profileRoutes");
const orderRoutes = require("./routes/orderRoutes");
const messagesRoutes = require("./routes/messagesRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const trackRoutes = require("./routes/trackRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const partyRoutes = require("./routes/partyRoutes");
const saleRoutes = require("./routes/saleRoutes");
const overviewRoutes = require("./routes/overviewRoutes");
const creditNoteRoutes = require("./routes/creditNoteRoutes");
const staffRoutes = require("./routes/staffRoutes");
const hsnRoutes = require("./routes/hsnRoutes");
const challanRoutes = require("./routes/challanRoutes");
const masterRoutes = require("./routes/masterRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/reviews", reviewRoutes);
// Public driver tracking links (token in the URL is the credential)
app.use("/api/track", trackRoutes);
// Enterprise Invoice Management API
app.use("/api/invoices", invoiceRoutes);
// The notification bell in the navbar calls these on every page; without the
// mount every request 404s.
app.use("/api/notifications", notificationRoutes);
// Wholesale 3.0: the wholesaler's own customer book.
app.use("/api/parties", partyRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/credit-notes", creditNoteRoutes);
// A wholesaler's employees. Owner only, except the invite acceptance.
app.use("/api/staff", staffRoutes);
// HSN suggestions for the boxes on the product and sale screens.
app.use("/api/hsn", hsnRoutes);
// Goods sent out while payment is outstanding. See challanService.js.
app.use("/api/challans", challanRoutes);
// The platform masters: states, units, tax slabs, HSN codes.
app.use("/api/masters", masterRoutes);

module.exports = app;
