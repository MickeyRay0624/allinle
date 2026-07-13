import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { ErrorCodes } from "@allinle/shared";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  if (process.env.NODE_ENV === "production" && !corsOrigin) {
    console.warn("WARNING: CORS_ORIGIN is not set in production!");
  }
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(",").map((o) => o.trim())
      : process.env.NODE_ENV === "production"
        ? false
        : true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Helmet security headers
  if (process.env.NODE_ENV === "production") {
    app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  }

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || "api";
  app.setGlobalPrefix(apiPrefix);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: errors
            .flatMap((error) => Object.values(error.constraints || {}))
            .filter(Boolean)
            .join("; "),
          code: ErrorCodes.VALIDATION_ERROR,
        }),
    }),
  );

  // Global interceptors & filters
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  // Swagger - only in non-production
  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("ALLINLE API")
      .setDescription("德州扑克记账与非现金化牌技训练工具 API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  const port = Number(process.env.PORT || process.env.API_PORT || 3000);
  await app.listen(port);
  console.log(
    `ALLINLE API listening on http://localhost:${port}/${apiPrefix}`,
  );
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `Swagger docs: http://localhost:${port}/${apiPrefix}/docs`,
    );
  }
}

bootstrap();
