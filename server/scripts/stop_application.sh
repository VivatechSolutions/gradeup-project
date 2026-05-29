#!/bin/bash

# Stop and remove Docker containers
docker ps -q | xargs -r docker stop
docker ps -a -q | xargs -r docker rm

# Optional: remove images
docker images -q | xargs -r docker rmi

# Optional: remove volumes
docker volume ls -q | xargs -r docker volume rm