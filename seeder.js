const { MongoClient } = require('mongodb');
const { faker } = require('@faker-js/faker');

// Configuration for different operations
const config = {
  uri: 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true',
  dbName: 'mass',
  collections: ['dummyuser', 'geolocation', 'sales'],
  operations: {
    insert: {
      batchSizeRange: { min: 1, max: 5 },
      delayRange: { min: 100, max: 500 }
    },
    update: {
      batchSizeRange: { min: 1, max: 3 },
      delayRange: { min: 200, max: 800 }
    },
    delete: {
      batchSizeRange: { min: 1, max: 2 },
      delayRange: { min: 500, max: 1000 }
    }
  }
};

// MongoDB client
const client = new MongoClient(config.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Base record generator with consistent timestamp handling
const generateBaseRecord = () => ({
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: new Date(0),
  isDeleted: false
});

// Function to generate a simplified numeric-heavy record for dummyuser
const generateSimpleNumericRecord = () => ({
  ...generateBaseRecord(),
  userId: faker.number.int({ min: 1, max: 10000 }),
  score: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  age: faker.number.int({ min: 18, max: 70 }),
  heightInCm: faker.number.int({ min: 150, max: 200 }),
  weightInKg: faker.number.float({ min: 50, max: 100, precision: 0.01 }),
  accountBalance: parseFloat(faker.finance.amount(100, 10000, 2)).toFixed(2), // Ensure decimal
  transactionCount: faker.number.int({ min: 1, max: 50 }),
  loginAttempts: faker.number.int({ min: 0, max: 10 }),
  averageSessionTimeInMinutes: faker.number.float({ min: 5, max: 60, precision: 0.01 }),
  isActive: faker.datatype.boolean(),
  lastLogin: faker.date.past()
});

// Function to generate a geolocation record
const generateGeolocationRecord = () => ({
  ...generateBaseRecord(),
  userId: faker.number.int({ min: 1, max: 10000 }),
  latitude: parseFloat(faker.location.latitude()).toFixed(2),
  longitude: parseFloat(faker.location.longitude()).toFixed(2),
  city: faker.location.city(),
  country: faker.location.country(),
  timestamp: faker.date.recent(),
  isActive: faker.datatype.boolean()
});

// Function to generate a sales record
const generateSalesRecord = () => ({
  ...generateBaseRecord(),
  productId: faker.number.int({ min: 1, max: 5000 }),
  userId: faker.number.int({ min: 1, max: 10000 }),
  price: parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 })).toFixed(2),
  quantity: faker.number.int({ min: 1, max: 10 }),
  saleDate: faker.date.recent(),
  storeLocation: faker.location.city(),
  paymentMethod: faker.finance.transactionType()
});

// Function to get random configuration values
const getRandomValue = (range) => Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

// Function to get a list of records for bulk insertion
const getRecordsBatch = (collectionName, batchSize) => {
  const records = [];
  for (let i = 0; i < batchSize; i++) {
    switch (collectionName) {
      case 'dummyuser':
        records.push(generateSimpleNumericRecord());
        break;
      case 'geolocation':
        records.push(generateGeolocationRecord());
        break;
      case 'sales':
        records.push(generateSalesRecord());
        break;
    }
  }
  return records;
};

// Function to generate update operations
const generateUpdateOperation = (record) => {
  const updates = {
    dummyuser: {
      accountBalance: Number(faker.finance.amount(100, 10000, 2)),
      score: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
      isActive: faker.datatype.boolean()
    },
    geolocation: {
      latitude: Number(faker.location.latitude()),
      longitude: Number(faker.location.longitude()),
      isActive: faker.datatype.boolean()
    },
    sales: {
      price: Number(faker.commerce.price({ min: 10, max: 1000, dec: 2 })),
      quantity: faker.number.int({ min: 1, max: 10 })
    }
  };

  return {
    ...updates[record.collection],
    updatedAt: new Date()
  };
};

// Operation handlers
async function handleInserts(db, collectionName) {
  const collection = db.collection(collectionName);
  while (true) {
    try {
      const batchSize = getRandomValue(config.operations.insert.batchSizeRange);
      const records = getRecordsBatch(collectionName, batchSize);
      await collection.insertMany(records);
      console.log(`Inserted ${batchSize} records into ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, getRandomValue(config.operations.insert.delayRange)));
    } catch (err) {
      console.error(`Insert error in ${collectionName}:`, err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function handleUpdates(db, collectionName) {
  const collection = db.collection(collectionName);
  while (true) {
    try {
      const batchSize = getRandomValue(config.operations.update.batchSizeRange);
      const records = await collection.find({ isDeleted: false }).limit(batchSize).toArray();
      
      for (const record of records) {
        const updates = generateUpdateOperation({ ...record, collection: collectionName });
        await collection.updateOne(
          { _id: record._id },
          { $set: updates }
        );
      }
      console.log(`Updated ${records.length} records in ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, getRandomValue(config.operations.update.delayRange)));
    } catch (err) {
      console.error(`Update error in ${collectionName}:`, err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function handleDeletes(db, collectionName) {
  const collection = db.collection(collectionName);
  while (true) {
    try {
      const batchSize = getRandomValue(config.operations.delete.batchSizeRange);
      const records = await collection.find({ isDeleted: false }).limit(batchSize).toArray();
      
      for (const record of records) {
        await collection.updateOne(
          { _id: record._id },
          { 
            $set: { 
              isDeleted: true,
              deletedAt: new Date()
            } 
          }
        );
      }
      console.log(`Soft deleted ${records.length} records in ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, getRandomValue(config.operations.delete.delayRange)));
    } catch (err) {
      console.error(`Delete error in ${collectionName}:`, err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Main function to start all operations
async function startOperations() {
  try {
    await client.connect();
    console.log('Connected to MongoDB replica set');
    const db = client.db(config.dbName);

    // Start operations for each collection
    for (const collectionName of config.collections) {
      // Insert operations
      handleInserts(db, collectionName).catch(console.error);
      
      // Update operations
      handleUpdates(db, collectionName).catch(console.error);
      
      // Delete operations
      handleDeletes(db, collectionName).catch(console.error);
    }

    console.log('All operations started successfully');
  } catch (err) {
    console.error('Error starting operations:', err);
    await client.close();
  }
}

// Start all operations
startOperations();