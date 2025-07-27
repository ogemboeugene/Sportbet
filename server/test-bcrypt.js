const bcrypt = require('bcrypt');
require('dotenv').config();

async function testBcrypt() {
  try {
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'SuperSecureAdminPassword123!';
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    console.log('Testing bcrypt with:');
    console.log('Password:', password);
    console.log('Salt rounds:', saltRounds);
    
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification result:', isValid);
    
  } catch (error) {
    console.error('Bcrypt test failed:', error.message);
  }
}

testBcrypt();
