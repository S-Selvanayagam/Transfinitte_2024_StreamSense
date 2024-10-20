from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, sum, count, avg, udf
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType
from elasticsearch import Elasticsearch

# Initialize Spark session
spark = SparkSession.builder \
    .appName("Redpanda-Spark-ElasticSearch") \
    .getOrCreate()

# Define the schema for Redpanda/Kafka messages (change streams from MongoDB)
schema = StructType() \
    .add("transactionId", StringType()) \
    .add("userId", StringType()) \
    .add("transactionAmount", DoubleType()) \
    .add("ipAddress", StringType()) \
    .add("timestamp", TimestampType())

# Read data from Redpanda (via Kafka API)
raw_stream_df = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:8888") \
    .option("subscribe", "mongo-changestreams") \
    .option("startingOffsets", "latest") \
    .load()

# Convert the Kafka 'value' field to JSON format based on the schema
parsed_df = raw_stream_df.selectExpr("CAST(value AS STRING)") \
    .select(from_json(col("value"), schema).alias("data")) \
    .select("data.*")

# === Apply Transformations === #

# Filter transactions with an amount greater than 1000
filtered_df = parsed_df.filter(col("transactionAmount") > 1000)

# Add a 10% surcharge to all transactions
transformed_df = filtered_df.withColumn("adjustedAmount", col("transactionAmount") * 1.1)

# Deduplicate records based on transactionId
deduped_df = transformed_df.dropDuplicates(["transactionId"])

# Aggregation: Calculate total transaction amount per user
aggregated_df = deduped_df.groupBy("userId") \
    .agg(
        sum("transactionAmount").alias("totalTransactionAmount"),
        count("transactionId").alias("transactionCount")
    )

# Average transaction amount per 5-minute window
windowed_df = deduped_df.groupBy("userId", col("timestamp").cast("timestamp").alias("timestamp")) \
    .agg(avg("transactionAmount").alias("avgTransactionAmount"))

# === Custom Enrichment === #
# UDF to enrich data with dummy location based on IP address
def lookup_location(ip_address):
    # In a real application, this could call an API for geolocation lookup
    return "Unknown Location"

lookup_location_udf = udf(lookup_location, StringType())
enriched_df = deduped_df.withColumn("location", lookup_location_udf(col("ipAddress")))

# === Alerting (Detect high-value transactions) === #
alerts_df = enriched_df.filter(col("transactionAmount") > 10000)

# === Write to ElasticSearch === #
def write_to_elasticsearch(df, epoch_id):
    # Elasticsearch client
    es = Elasticsearch([{'host': 'localhost', 'port': 9200}])

    # Convert the dataframe rows to dictionary and index them to ElasticSearch
    for row in df.collect():
        document = row.asDict()
        es.index(index="transactions", doc_type="_doc", body=document)

# Write the final processed data to ElasticSearch
es_query = enriched_df.writeStream \
    .foreachBatch(write_to_elasticsearch) \
    .start()

# Write alerts (high-value transactions) to ElasticSearch
alerts_query = alerts_df.writeStream \
    .foreachBatch(write_to_elasticsearch) \
    .start()

# Wait for both streams to finish
es_query.awaitTermination()
alerts_query.awaitTermination()
