const bcrypt = require('bcrypt');
require('dotenv').config();

async function testBcryptWithConfig() {
  try {
    // Use exact same values as the server
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'SuperSecureAdminPassword123!';
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    console.log('Testing with exact server config:');
    console.log('Password:', password);
    console.log('Salt rounds:', saltRounds);
    console.log('Password length:', password.length);
    
    // Test the original approach
    console.log('\n--- Testing direct hash with saltRounds ---');
    try {
      const hash1 = await bcrypt.hash(password, saltRounds);
      console.log('✓ Direct hash successful:', hash1.substring(0, 30) + '...');
    } catch (error) {
      console.log('✗ Direct hash failed:', error.message);
    }
    
    // Test the explicit salt generation
    console.log('\n--- Testing explicit salt generation ---');
    try {
      const salt = await bcrypt.genSalt(saltRounds);
      console.log('Generated salt:', salt);
      const hash2 = await bcrypt.hash(password, salt);
      console.log('✓ Explicit salt hash successful:', hash2.substring(0, 30) + '...');
    } catch (error) {
      console.log('✗ Explicit salt hash failed:', error.message);
    }
    
    // Test with different salt rounds
    console.log('\n--- Testing with salt rounds 10 ---');
    try {
      const hash3 = await bcrypt.hash(password, 10);
      console.log('✓ Salt rounds 10 successful:', hash3.substring(0, 30) + '...');
    } catch (error) {
      console.log('✗ Salt rounds 10 failed:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBcryptWithConfig();
