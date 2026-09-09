# Multi-stage Dockerfile for PotholeScan backend
# Build stage
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace

# Copy only maven wrapper and pom first to leverage caching
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make wrapper executable
RUN chmod +x ./mvnw || true

# Copy source
COPY src ./src

# Build jar (skip tests to speed up) - generates target/*.jar
RUN ./mvnw -B -DskipTests package

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy jar from build stage
COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar ./app.jar

# Optional: expose port
EXPOSE 8080

# Recommended Java options can be overridden at deploy time
ENV JAVA_OPTS="-Xms256m -Xmx512m"

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]

