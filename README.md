# Transfinitte MD1

Solution is deployed on - https://smartpointers.deltaforce.dev

Drive Link - https://drive.google.com/drive/folders/1qIhISexgK6LiKTiPe7RrMfAGTIPK12Sc?usp=sharing

Building Real-Time Analytics Dashboards with MongoDB Change Streams
MongoDB's change streams provide a way to track changes to the database in
real-time. However, using change streams effectively for complex analytics
and dashboards presents challenges, especially when dealing with multiple
data sources and high-frequency updates.

Create a system that uses MongoDB change streams to power real-time analytics
dashboards. The solution should handle data aggregation from multiple
collections, process real-time updates, and deliver insights within seconds.

- Integrate change streams from multiple MongoDB collections to populate a
real-time dashboard.

- Support dynamic data filters, transformation rules, and customizable
views.

- Implement alerting mechanisms for detecting significant changes or
trends.

-  Design the system to handle high-frequency updates with minimal
performance degradation


`docker-compose` will contains these services
- Apache Kafka
- Zookeeper
- Apache Kafka Connect
- Confluent REST Proxy for Kafka
- Confluent Schema Registry
- MongoDB Connector 
- Elasticsearch Connector Sink
- MongoDB single node replica set
- Kibana
- Elasticsearch
- Redpanda Console (integrated with Schema Registry and Kafka Connect)

### Start Development 🚧
step 1) you have to change directories and start all services by using
```sh
cd playgrounds/mongodb-elasticsearch
make up
```

step 2) shell to some container (we will use `mongo1`)
```sh
make exe
```

step 3) we have to create collection first for initialing cursor that source connector use it to capture changes and produce it to kafka topic

3.1) shell to MongoDB replica
```sh
mongo mongodb://mongo1:27017/?replicaSet=rs0    # for MongoDB version 3.X
mongosh mongodb://mongo1:27017/?replicaSet=rs0  # for MongoDB version 6.X
```

3.2) switch to target database
```sh
use quickstart
```

3.3) create a collection
```js
db.createCollection('sampleData')
```

step 4) add source and sink connector, these command will add `mongo-source` as source connector and `elasticsearch-sink` as sink connector to capture data changes from upstream data to Kafka topic then push it to downstream. for more commands, you can see at `scripts/kafka-connect/requests.sh`

(optional) you can do this step by using Redpanda Console to create/edit/delete connectors on this [http://localhost:8888/connect-clusters/connect-local](http://localhost:8888/connect-clusters/connect-local)


4.1) shell and open new session for commanding connector
```sh
make exe
```

4.2) add connectors
```sh
# add new mongo-source connector as a source connector by using JsonSchemaConverter
curl -X POST \
  -H "Content-Type: application/json" \
  --data '
  {
    "name": "mongo-source",
    "config": {
      "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
      "connection.uri": "mongodb://mongo1:27017/?replicaSet=rs0",
      "database": "quickstart",
      "collection": "sampleData",
      "pipeline": "[{\"$match\": {\"operationType\": \"insert\"}}, {$addFields : {\"fullDocument.travel\":\"MongoDB Kafka Connector\"}}]",

      "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
      "output.format.value": "schema",
      "output.format.key": "json",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "output.schema.infer.value" : true,
      "publish.full.document.only": true,

      "transforms": "createKey,extractString",
      "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
      "transforms.createKey.fields": "hello",
      "transforms.extractString.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
      "transforms.extractString.field": "hello"
    }
  }
  ' \
  http://connect:8083/connectors -w "\n"

# add new elasticsearch-sink connector as a sink connector by using JsonSchemaConverter
curl -X POST \
  -H "Content-Type: application/json" \
  --data '
	{
    "name": "elasticsearch-sink",
    "config": {
      "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
      "connection.url": "http://elasticsearch:9200",
      "topics": "quickstart.sampleData",
      "tasks.max": "1",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "transforms": "createKey,extractString,ReplaceField",
      "transforms.createKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
      "transforms.createKey.fields": "_id",
      "transforms.extractString.type": "org.apache.kafka.connect.transforms.ExtractField$Key",
      "transforms.extractString.field": "_id",
      "transforms.ReplaceField.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
      "transforms.ReplaceField.exclude": "_id"
    }
	}
	' \
  http://connect:8083/connectors -w "\n"
```

step 5) we will try to trigger or make some change events to out upstream system by insert one document to collection. for more commands, you can see at `scripts/mongodb/manual.js`

5.1) insert or update document that make event changes. you can read other events from this [Change Events - MongoDB](https://www.mongodb.com/docs/manual/reference/change-events/)
```js
db.sampleData.insertOne({ "hello": "world"})


db.sampleData.updateOne(
  { _id: ObjectId("your-document-object-id") },
  { $set: { hello: "updated"} },
)
```

5.2) k6 load testing

```sh
k6 run loader.js
```


