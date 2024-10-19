const { MongoClient } = require('mongodb');
const { faker } = require('@faker-js/faker');

// MongoDB connection details
const uri = 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true';
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Database and collection to seed
const dbName = 'quickstart';
const collectionName = 'abcd';

// Function to generate a random delay between 500 and 1200 ms
const randomDelay = () => Math.floor(Math.random() * 701) + 500; // 0 to 700 ms + 500 = 500 to 1200 ms

// Function to generate a simplified numeric-heavy record
const generateSimpleNumericRecord = () => ({
  userId: faker.number.int({ min: 1, max: 10000 }),
  score: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  age: faker.number.int({ min: 18, max: 70 }),
  heightInCm: faker.number.int({ min: 150, max: 200 }),
  weightInKg: faker.number.float({ min: 50, max: 100, precision: 0.1 }),
  accountBalance: parseFloat(faker.finance.amount(100, 10000, 2)).toFixed(2),
  transactionCount: faker.number.int({ min: 1, max: 50 }),
  loginAttempts: faker.number.int({ min: 0, max: 10 }),
  averageSessionTimeInMinutes: faker.number.float({ min: 5, max: 60, precision: 0.1 }),
  isActive: faker.datatype.boolean(),
  lastLogin: faker.date.past(),
  createdAt: new Date(),
});

// Seeder function
async function seedCollection() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB replica set');

    // Access the collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    console.log(`Starting to seed ${collectionName} collection...`);

    // Infinite loop to insert records continuously
    while (true) {
      const record = generateSimpleNumericRecord();
      await collection.insertOne(record);
      console.log(`Inserted a new record accbal: ${record.accountBalance}, id: ${record.userId}`);

      // Wait for a random delay before the next insertion
      await new Promise((resolve) => setTimeout(resolve, randomDelay()));
    }
  } catch (err) {
    console.error('Error seeding collection:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Start the seeder
seedCollection();
