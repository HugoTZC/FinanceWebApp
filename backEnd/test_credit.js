const creditModel = require('./src/models/creditModel');
const db = require('./src/config/database');

async function test() {
  try {
    // Use a known user ID and card ID from your database
    const userId = 'ec7a18f1-1e56-4152-85e2-d7546d48afd3';
    const cardId = 'some-card-id'; // need to get a real card ID
    const year = 2026;
    
    // First, get cards for this user
    const cards = await creditModel.getCreditCards(userId);
    console.log('Cards:', cards);
    
    if (cards.length > 0) {
      const firstCard = cards[0];
      console.log('Testing with card:', firstCard.id);
      
      const monthly = await creditModel.getCardMonthlySpending(firstCard.id, userId, year);
      console.log('Monthly spending:', monthly);
    } else {
      console.log('No cards found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();