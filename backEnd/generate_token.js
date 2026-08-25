const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
const userId = process.argv[2];

if (!secret || !userId) {
  throw new Error('Usage: JWT_SECRET=<secret> node generate_token.js <user-id>');
}

const token = jwt.sign({ id: userId }, secret, { expiresIn: '5d' });
console.log('Token:', token);
