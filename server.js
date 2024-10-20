const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3001;

const config = {
  uri: 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true',
  dbName: 'final',
};

const client = new MongoClient(config.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/stats', async (req, res) => {
  try {
    const db = client.db(config.dbName);
    const stats = {};

    for (const collection of ['dummyuser', 'geolocation', 'sales']) {
      stats[collection] = await db.collection(collection).countDocuments();
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/random/:collection', async (req, res) => {
  const { collection } = req.params;
  try {
    const db = client.db(config.dbName);
    const result = await db.collection(collection).aggregate([{ $sample: { size: 1 } }]).toArray();
    res.json(result[0] || null);
  } catch (error) {
    console.error(`Error fetching random document from ${collection}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();