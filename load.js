import http from 'k6/http';
import { check, sleep } from 'k6';
import { faker } from 'https://cdn.jsdelivr.net/npm/faker@5.5.3/+esm';

// Configuration
const config = {
  vus: 10,  // Number of virtual users
  duration: '5m',  // Test duration
  baseUrl: 'http://localhost:3000',  // Assuming you have an API to interact with MongoDB
  collections: ['dummyuser', 'geolocation', 'sales'],
  operations: {
    insert: { weight: 0.6, delay: { min: 100, max: 500 } },
    update: { weight: 0.3, delay: { min: 200, max: 800 } },
    delete: { weight: 0.1, delay: { min: 500, max: 1000 } }
  }
};

// Helper function to generate random data
function generateData(collection) {
  switch (collection) {
    case 'dummyuser':
      return {
        userId: faker.datatype.number({ min: 1, max: 10000 }),
        score: faker.datatype.float({ min: 0, max: 100, precision: 0.01 }),
        age: faker.datatype.number({ min: 18, max: 70 }),
        accountBalance: parseFloat(faker.finance.amount(100, 10000, 2)),
        isActive: faker.datatype.boolean()
      };
    case 'geolocation':
      return {
        userId: faker.datatype.number({ min: 1, max: 10000 }),
        latitude: parseFloat(faker.address.latitude()),
        longitude: parseFloat(faker.address.longitude()),
        city: faker.address.city(),
        country: faker.address.country(),
        isActive: faker.datatype.boolean()
      };
    case 'sales':
      return {
        productId: faker.datatype.number({ min: 1, max: 5000 }),
        userId: faker.datatype.number({ min: 1, max: 10000 }),
        price: parseFloat(faker.commerce.price(10, 1000)),
        quantity: faker.datatype.number({ min: 1, max: 10 }),
        storeLocation: faker.address.city(),
        paymentMethod: faker.finance.transactionType()
      };
  }
}

// Helper function to choose a random operation based on weights
function chooseOperation() {
  const rand = Math.random();
  let sum = 0;
  for (const [op, details] of Object.entries(config.operations)) {
    sum += details.weight;
    if (rand < sum) return op;
  }
}

// Main function to define the k6 test
export default function () {
  const collection = faker.random.arrayElement(config.collections);
  const operation = chooseOperation();
  const url = `${config.baseUrl}/${collection}`;

  let response;
  const data = generateData(collection);

  switch (operation) {
    case 'insert':
      response = http.post(url, JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      break;
    case 'update':
      response = http.put(`${url}/${data.userId}`, JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      break;
    case 'delete':
      response = http.del(`${url}/${data.userId}`);
      break;
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(faker.datatype.number(config.operations[operation].delay));
}

// k6 options
export const options = {
  vus: config.vus,
  duration: config.duration,
};