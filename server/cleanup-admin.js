const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const adminCollection = db.collection('adminusers');
    
    // Find existing admins
    const existingAdmins = await adminCollection.find({}).toArray();
    console.log('Existing admins:', existingAdmins.length);
    
    if (existingAdmins.length > 0) {
      console.log('Removing existing admins...');
      const result = await adminCollection.deleteMany({});
      console.log(`Deleted ${result.deletedCount} admin records`);
    }
    
    console.log('Admin cleanup completed');
  } catch (error) {
    console.error('Error cleaning up admins:', error);
  } finally {
    await client.close();
  }
}

cleanupAdmin();
