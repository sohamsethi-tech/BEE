# PotholeScan

PotholeScan is a full-stack pothole detection platform. The mobile application collects location, speed, and motion data, while the Spring Boot API validates detections, calculates severity, stores reports, and exposes analytics.

## Project Structure

```text
.
├── src/                 Spring Boot backend
├── sql/                 Database schema and SQL files
├── frontend/            Expo React Native mobile application
├── Dockerfile           Backend container definition
├── render.yaml          Render deployment blueprint
├── pom.xml              Maven configuration
└── test_api.sh          API smoke-test script
```

## Features

- Pothole detection using acceleration and vehicle speed
- Severity and confidence calculation
- Location and sensor-data validation
- Pothole listing, filtering, deletion, and statistics
- JWT-based authentication and protected endpoints
- MySQL, PostgreSQL, and H2 database support
- REST API with health-check endpoint
- Expo mobile frontend for detection and dashboard workflows
- Docker and Render deployment configuration

## Requirements

- Java 17 or newer
- Maven 3.8+ (or use the included Maven wrapper)
- Node.js 18 or newer
- npm
- Docker, if running the backend in a container

## Run the Backend

From the repository root:

```bash
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`.

Build a runnable JAR:

```bash
./mvnw clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Check the service:

```bash
curl http://localhost:8080/api/health
```

## Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npx expo start
```

Use Expo Go, an Android emulator, an iOS simulator, or a development build. Update the API base URL in `frontend/constants/backend.ts` when the backend is running on another device or host.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check backend health |
| `POST` | `/api/detect-pothole` | Create a pothole detection |
| `GET` | `/api/potholes` | List detections, optionally filtered by severity |
| `DELETE` | `/api/potholes/{id}` | Delete a detection |
| `GET` | `/api/stats` | Get detection statistics |

See `API_DOCUMENTATION.md` for request and response examples.

## Database Configuration

The application supports profiles for local, MySQL, and production environments:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

For deployed environments, configure the database connection and JWT secret through environment variables. Never commit real passwords, tokens, or JWT secrets to the repository.

## Docker

Build and run the backend container:

```bash
docker build -t potholescan-backend .
docker run --rm -p 8080:8080 potholescan-backend
```

The `render.yaml` file contains the Render web-service and database blueprint.

## Testing

Run the backend tests:

```bash
./mvnw test
```

With the backend running, execute the API smoke tests:

```bash
chmod +x test_api.sh
./test_api.sh
```

## Repository

GitHub: https://github.com/sohamsethi-tech/BEE