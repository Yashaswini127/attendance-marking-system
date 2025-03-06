const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.urlencoded({ extended: true })); // To parse form data

// ✅ Improved MongoDB Connection
const MONGO_URI = 'mongodb://127.0.0.1:27017/attendanceDB'; // Use 127.0.0.1 instead of localhost for reliability

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Failed:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    attendance: [{ date: String, status: String }]
});

const User = mongoose.model('User', userSchema);

// ✅ Register Route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, contact, register } = req.body; // Include contact and register

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, contact, register }); // Include contact and register

        await newUser.save();
        res.status(201).json({ message: "✅ User registered successfully" });

    } catch (err) {
        console.error(err);
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

        const token = jwt.sign({ id: user._id, role: user.role }, 'secretkey', { expiresIn: '1h' });
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

// ✅ Get Attendance Data
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

// ✅ Admin Route - Get All Users
app.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, 'name email role');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Serve Frontend Pages
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'home.html'));
});

// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
