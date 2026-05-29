#!/bin/bash
set -e

CONTAINER_NAME="gradeup"
IMAGE_TAG="varuntej18/gradeup-new:latest"
PORT=5000
SECRET_ID="Gradeup/env/secrets"
REGION="us-east-1"
ENV_FILE="/home/ec2-user/.env"

echo "Fetching secrets from AWS Secrets Manager..."

SECRET=$(aws secretsmanager get-secret-value \
  --secret-id $SECRET_ID \
  --region $REGION \
  --query SecretString \
  --output text)

echo "Converting JSON secret to .env format..."
echo "$SECRET" | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' > $ENV_FILE

echo "Stopping old container if exists..."
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

echo "Pulling latest image..."
docker pull $IMAGE_TAG

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:5000 \
  --restart unless-stopped \
  --env-file $ENV_FILE \
  $IMAGE_TAG

echo "Container started successfully."