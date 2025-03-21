require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

const TransactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String, // "income" or "expense"
  category: String,
  date: Date,
  note: String
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, email, password: hashedPassword });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'User not found' });
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

app.post('/transactions', async (req, res) => {
  const { token, amount, type, category, date, note } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const transaction = await Transaction.create({
      userId: decoded.userId, amount, type, category, date, note
    });
    res.json(transaction);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/transactions', async (req, res) => {
  const { token } = req.headers;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const transactions = await Transaction.find({ userId: decoded.userId });
    res.json(transactions);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
