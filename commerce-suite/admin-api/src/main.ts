import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");
  app.enableCors({
    origin: [
      /localhost:3010$/,
      /127\.0\.0\.1:3010$/,
      /localhost:5173$/,
      /127\.0\.0\.1:5173$/,
      /localhost:5174$/,
      /127\.0\.0\.1:5174$/,
      /localhost:4173$/,
      /127\.0\.0\.1:4173$/,
      /^https:\/\/[\w.-]+\.fly\.dev$/,
      /^https:\/\/[\w.-]+\.netlify\.app$/,
    ],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ? Number(process.env.PORT) : 3020;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`commerce-admin-api listening on http://localhost:${port}/v1`);
}

bootstrap();
