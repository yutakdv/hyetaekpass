FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY BE/ BE/
COPY contracts/catalog.schema.json contracts/empty-catalog.json contracts/
WORKDIR /workspace/BE
RUN chmod +x gradlew && ./gradlew --no-daemon bootJar test -PskipDatabaseTests

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /workspace/BE/build/libs/hyetaekpass-api-0.1.0.jar app.jar
COPY infra/aws/rds-ca.crt /app/rds-ca.crt
RUN mkdir /journal && chown -R 10001:10001 /app /journal
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
