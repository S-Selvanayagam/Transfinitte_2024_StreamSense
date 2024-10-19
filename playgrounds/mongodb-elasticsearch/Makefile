source:
	# self alias
	sourcezsh 
down:
	docker compose -p poc-kafka-connect-cdc-mongodb-to-es down

down.rm:
	docker-compose -p poc-kafka-connect-cdc-mongodb-to-es down --rmi all

up:
	docker compose -p poc-kafka-connect-cdc-mongodb-to-es up --force-recreate --build --renew-anon-volumes --remove-orphans -d

setup:
	docker exec mongo1 /home/requests.sh

up.rm:
	docker-compose -p poc-kafka-connect-cdc-mongodb-to-es up -d 

exe:
	docker exec -it mongo1 /bin/bash 

yeet:
	docker compose -p poc-kafka-connect-cdc-mongodb-to-es down -v