const { MongoClient } = require('mongodb');
const { faker } = require('@faker-js/faker');

// Statistical functions don't need to be async since they don't involve I/O operations
const normalDistribution = (mean, stdDev) => {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z;
};

// Ensure value stays within bounds
const clamp = (value, min, max) => Math.min(Math.max(Math.round(value), min), max);

const config = {
  uri: 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true',
  dbName: 'final',
  collections: ['dummyuser', 'geolocation', 'sales'],
  operations: {
    insert: {
      getBatchSize: () => {
        // Mean of 5 with std dev of 2
        return clamp(normalDistribution(5, 2), 1, 15);
      },
      getDelay: () => {
        // Base delay with normal distribution
        return clamp(normalDistribution(200, 50), 100, 400);
      }
    },
    update: {
      getBatchSize: () => {
        // Updates tend to be smaller than inserts
        return clamp(normalDistribution(3, 1.5), 1, 10);
      },
      getDelay: () => {
        // Updates slightly slower than inserts
        return clamp(normalDistribution(300, 75), 150, 600);
      }
    },
    delete: {
      getBatchSize: () => {
        // Deletes are typically smaller operations
        return clamp(normalDistribution(2, 1), 1, 8);
      },
      getDelay: () => {
        // Deletes happen less frequently
        return clamp(normalDistribution(500, 100), 300, 800);
      }
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
  timestamp: new Date(),
  isUpdated: false,
  isDeleted: false,
  action: 'insert'
});

// Function to generate a simplified numeric-heavy record for dummyuser
const generateSimpleNumericRecord = () => ({
  ...generateBaseRecord(),
  userId: faker.number.int({ min: 1, max: 10000 }),
  score: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  age: faker.number.int({ min: 18, max: 70 }),
  heightInCm: faker.number.int({ min: 150, max: 200 }),
  weightInKg: faker.number.float({ min: 50, max: 100, precision: 0.01 }),
  accountBalance: parseFloat(faker.finance.amount(100, 10000, 2)).toFixed(2),
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
  location: [
    parseFloat(faker.location.longitude()).toFixed(2),
    parseFloat(faker.location.latitude()).toFixed(2)
  ],
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
      accountBalance: parseFloat(faker.finance.amount(100, 10000, 2)).toFixed(2),
      score: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
      isActive: faker.datatype.boolean()
    },
    geolocation: {
      latitude: parseFloat(faker.location.latitude()).toFixed(2),
      longitude: parseFloat(faker.location.longitude()).toFixed(2),
      isActive: faker.datatype.boolean()
    },
    sales: {
      price: parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 })).toFixed(2),
      quantity: faker.number.int({ min: 1, max: 10 })
    }
  };

  return {
    ...updates[record.collection],
    timestamp: new Date(),
    isUpdated: true,
    action: 'update'
  };
};

// Operation handlers
async function handleInserts(db, collectionName) {
  const collection = db.collection(collectionName);
  while (true) {
    try {
      const batchSize = config.operations.insert.getBatchSize();
      const records = getRecordsBatch(collectionName, batchSize);
      await collection.insertMany(records);
      console.log(`Inserted ${batchSize} records into ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, config.operations.insert.getDelay()));
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
      const batchSize = config.operations.update.getBatchSize();
      const records = await collection.find({ isDeleted: false }).limit(batchSize).toArray();
      
      for (const record of records) {
        const updates = generateUpdateOperation({ ...record, collection: collectionName });
        await collection.updateOne(
          { _id: record._id },
          { $set: updates }
        );
      }
      console.log(`Updated ${records.length} records in ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, config.operations.update.getDelay()));
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
      const batchSize = config.operations.delete.getBatchSize();
      const records = await collection.find({ isDeleted: false }).limit(batchSize).toArray();
      
      for (const record of records) {
        await collection.updateOne(
          { _id: record._id },
          { 
            $set: { 
              isDeleted: true,
              timestamp: new Date(),
              action: 'delete'
            } 
          }
        );
      }
      console.log(`Soft deleted ${records.length} records in ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, config.operations.delete.getDelay()));
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