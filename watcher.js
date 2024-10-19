const { MongoClient, ObjectId, Binary } = require('mongodb');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import cors

// Server and MongoDB connection details
const uri = 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true';
const port = process.env.PORT || 3000; // Use environment variable for port

const client = new MongoClient(uri);
const dbName = 'quickstart';
const collectionName = 'dummydata';

async function watchCollection() {
  try {
    await client.connect();
    console.log('Connected to MongoDB replica set');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const changeStream = collection.watch();
    console.log(`Watching for changes in the ${collectionName} collection...`);

    // Setup Socket.IO server
    const app = http.createServer();
    const io = new Server(app, {
      cors: {
        origin: "http://127.0.0.1:5500", // Allow requests from your frontend
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected');

      changeStream.on('change', (change) => {
        console.log('Change detected:', change);
        // Check for insert operation and extract relevant data
        if (change.operationType === 'insert') {
          const data = {
            userId: change.fullDocument.userId,
            score: change.fullDocument.score,
            age: change.fullDocument.age,
            heightInCm: change.fullDocument.heightInCm,
            weightInKg: change.fullDocument.weightInKg,
            accountBalance: change.fullDocument.accountBalance,
            transactionCount: change.fullDocument.transactionCount,
            loginAttempts: change.fullDocument.loginAttempts,
            averageSessionTimeInMinutes: change.fullDocument.averageSessionTimeInMinutes,
            isActive: change.fullDocument.isActive,
            lastLogin: change.fullDocument.lastLogin,
            createdAt: change.fullDocument.createdAt,
          };
          socket.emit('newData', data); // Emit data to connected clients
        }
      });
    });

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

  } catch (err) {
    console.error('Error watching collection:', err);
  }
}

watchCollection();
