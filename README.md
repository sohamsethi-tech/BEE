# PotholeScan

PotholeScan is a pothole detection platform with a Spring Boot backend and an Expo React Native mobile app.

## Backend

```bash
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`.

## Mobile App

Install dependencies and start the Expo SDK 57 app from the repository root:

```bash
npm install
npx expo start
```

The app uses Expo Router and can run in Expo Go, an Android emulator, an iOS simulator, or a development build.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check backend health |
| `POST` | `/api/detect-pothole` | Create a pothole detection |
| `GET` | `/api/potholes` | List detections |
| `DELETE` | `/api/potholes/{id}` | Delete a detection |
| `GET` | `/api/stats` | Get detection statistics |

For deployed environments, configure database and JWT settings through environment variables. Never commit real passwords, tokens, or secrets.

Repository: https://github.com/sohamsethi-tech/BEE
