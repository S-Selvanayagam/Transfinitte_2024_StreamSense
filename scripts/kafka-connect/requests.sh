#!/usr/bin/env bash

# list all connectors
curl -X GET http://connect:8083/connectors

# list connector, tasks, and workers
curl -X GET -s "http://connect:8083/connectors?expand=info&expand=status" | jq '.'

# delete connector
curl -X DELETE http://connect:8083/connectors/mongo-source
curl -X DELETE http://connect:8083/connectors/elasticsearch-sink

# "output.format.value": "json",

# "errors.tolerance": "all",
#     "errors.log.enable": true,
#     "errors.log.include.messages": true,

#     "topic.namespace.map": "{\"*\": \"mass\"}",
#     "topic.prefix": "mongo",
#     "topic.suffix": "",

# add new mongo-source connector as a source connector by using JsonSchemaConverter
curl -X POST \
  -H "Content-Type: application/json" \
  --data '
  {
  "name": "mongo-source3",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://mongo1:27017/?replicaSet=rs0",
    "database": "quickstart",
    "collection": "sales",

    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
      "output.format.value": "schema",
      "output.format.key": "json",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "output.schema.infer.value" : true,
      "publish.full.document.only": true
  }
}
  ' \
  http://connect:8083/connectors -w "\n"

# add new elasticsearch-sink connector as a sink connector by using JsonSchemaConverter
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{
    "name": "elasticsearch-sink",
    "config": {
        "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
        "connection.url": "http://elasticsearch:9200",
        "topics": "quickstart.*",
        "tasks.max": "1",
        "value.converter": "io.confluent.connect.json.JsonSchemaConverter",
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
}' \
  http://connect:8083/connectors -w "\n"

# mongo mongodb://mongo1:27017/?replicaSet=rs0

# RUN THE BELOW COMMANDS

curl -X DELETE http://connect:8083/connectors/mongo-source1; curl -X DELETE http://connect:8083/connectors/mongo-source2; curl -X DELETE http://connect:8083/connectors/mongo-source3; curl -X DELETE http://connect:8083/connectors/elasticsearch-sink;

curl -X POST \
  -H "Content-Type: application/json" \
  --data '
  {
  "name": "mongo-source3",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://mongo1:27017/?replicaSet=rs0",
    "database": "mass",
    "collection": "sales",

    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
      "output.format.value": "schema",
      "output.format.key": "json",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "output.schema.infer.value" : true,
      "publish.full.document.only": true
  }
}
  ' \
  http://connect:8083/connectors -w "\n";
curl -X POST \
  -H "Content-Type: application/json" \
  --data '
  {
  "name": "mongo-source2",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://mongo1:27017/?replicaSet=rs0",
    "database": "mass",
    "collection": "geolocation",

    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
      "output.format.value": "schema",
      "output.format.key": "json",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "output.schema.infer.value" : true,
      "publish.full.document.only": true
  }
}
  ' \
  http://connect:8083/connectors -w "\n";
curl -X POST \
  -H "Content-Type: application/json" \
  --data '
  {
  "name": "mongo-source1",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://mongo1:27017/?replicaSet=rs0",
    "database": "mass",
    "collection": "dummyuser",

    "output.json.formatter": "com.mongodb.kafka.connect.source.json.formatter.SimplifiedJson",
      "output.format.value": "schema",
      "output.format.key": "json",

      "value.converter":"io.confluent.connect.json.JsonSchemaConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",

      "output.schema.infer.value" : true,
      "publish.full.document.only": true
  }
}
  ' \
  http://connect:8083/connectors -w "\n";


curl -X POST \
  -H "Content-Type: application/json" \
  --data '{
    "name": "elasticsearch-sink",
    "config": {
        "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
        "connection.url": "http://elasticsearch:9200",
        "topics": "mass.sales,mass.geolocation,mass.dummyuser",
        "tasks.max": "1",
        "value.converter": "io.confluent.connect.json.JsonSchemaConverter",
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
}' \
  http://connect:8083/connectors -w "\n";
curl -X GET -s "http://connect:8083/connectors?expand=info&expand=status" | jq '.';