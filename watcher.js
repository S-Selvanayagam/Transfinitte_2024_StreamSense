const { MongoClient } = require('mongodb');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import configuration from seeder script
const config = {
  uri: 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true',
  dbName: 'mass',
  collections: ['dummyuser', 'geolocation', 'sales'],
};

const port = process.env.PORT || 3000;
const client = new MongoClient(config.uri);

async function watchCollections() {
  try {
    await client.connect();
    console.log('Connected to MongoDB replica set');

    const db = client.db(config.dbName);
    const app = http.createServer();
    
    // Set up watchers for each collection
    config.collections.forEach(collectionName => {
      const collection = db.collection(collectionName);
      const changeStream = collection.watch();
      
      console.log(`Watching for changes in the ${collectionName} collection...`);
      
      changeStream.on('change', (change) => {
        const timestamp = new Date().toISOString();
        
        switch (change.operationType) {
          case 'insert':
            console.log(`[${timestamp}] INSERT in ${collectionName}:`, {
              documentId: change.documentKey._id,
              newDocument: change.fullDocument
            });
            break;
            
          case 'update':
            console.log(`[${timestamp}] UPDATE in ${collectionName}:`, {
              documentId: change.documentKey._id,
              updatedFields: change.updateDescription.updatedFields,
              removedFields: change.updateDescription.removedFields
            });
            break;
            
          case 'delete':
            console.log(`[${timestamp}] DELETE in ${collectionName}:`, {
              documentId: change.documentKey._id
            });
            break;
            
          default:
            console.log(`[${timestamp}] ${change.operationType.toUpperCase()} operation in ${collectionName}:`, change);
        }
      });

      // Error handling for change stream
      changeStream.on('error', error => {
        console.error(`Error in ${collectionName} change stream:`, error);
      });
    });

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

  } catch (err) {
    console.error('Error watching collections:', err);
    if (client) {
      await client.close();
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  if (client) {
    await client.close();
  }
  process.exit();
});

watchCollections();