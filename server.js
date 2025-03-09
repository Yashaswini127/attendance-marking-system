require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.urlencoded({ extended: true })); // To parse form data

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Jet-Club:JETClub2025@cluster0.u7mfy.mongodb.net/"; // Use environment variable
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Failed:", err));

// Define User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    contact: { type: String },
    register: { type: String },
    attendance: [{ date: String, status: String }]
});

const User = mongoose.model('User', userSchema);

// ✅ Authentication Middleware
const authenticateUser = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secretkey');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token." });
    }
};

// ✅ Register Route
app.post("/register", async (req, res) => {
    console.log("📩 Received registration request with data:", req.body);

    const { name, contact, email, register, password } = req.body;

    if (!email) {
        console.log("❌ Error: Email is missing");
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Save user using Mongoose
        const newUser = new User({
            name,
            contact,
            email,
            register,
            password: hashedPassword
        });

        await newUser.save();
        console.log("✅ User registered successfully!");
        res.status(201).json({ message: "User registered successfully" });

    } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Login Route
app.post('/login2', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "❌ User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "❌ Invalid credentials" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
        res.json({ message: "✅ Login successful", token, role: user.role });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Mark Attendance
app.post('/mark-attendance', async (req, res) => {
    try {
        const { email, status } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "❌ User not found" });

        const today = new Date().toISOString().split('T')[0];
        user.attendance.push({ date: today, status });

        await user.save();
        res.json({ message: "✅ Attendance marked" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Get Attendance for a User
app.get('/attendance/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });

        if (!user) return res.status(400).json({ error: "❌ User not found" });

        res.json(user.attendance);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Get All Users (Admin Route)
app.get('/admin/users', authenticateUser, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "❌ Access denied" });
        }

        const users = await User.find({}, 'name email role');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'home.html'));
});

// ✅ Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
