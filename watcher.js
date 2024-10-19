// Import MongoDB client
const { MongoClient } = require('mongodb');

// MongoDB connection details
const uri = 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true';
const client = new MongoClient(uri);

// Database and collection to watch
const dbName = 'quickstart';
const collectionName = 'sampleData';

// Watcher function
async function watchCollection() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB replica set');

    // Access the collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Set up a change stream to watch for changes in the collection
    const changeStream = collection.watch();

    console.log(`Watching for changes in the ${collectionName} collection...`);

    // Listen to the change events
    changeStream.on('change', (change) => {
      console.log('Change detected:', change);
    });

  } catch (err) {
    console.error('Error watching collection:', err);
  }
}

// Start the watcher
watchCollection();
