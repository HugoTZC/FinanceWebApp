const jwt = require('jsonwebtoken');

const secret = 'finTZC_jwt_secret';
const userId = 'ec7a18f1-1e56-4152-85e2-d7546d48afd3';

const token = jwt.sign({ id: userId }, secret, { expiresIn: '5d' });
console.log('Token:', token);