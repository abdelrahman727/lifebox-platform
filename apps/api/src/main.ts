import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { CommandTemplateService } from './modules/control/command-template.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // API prefix
  app.setGlobalPrefix('api/v1');

  app.use(
    '/api/v1/fawry/payment-notification',
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // limit each IP to 10 requests per minute
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('LifeBox API')
    .setDescription('IoT Remote Monitoring & Control Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Initialize default command templates
  try {
    const commandTemplateService = app.get(CommandTemplateService);
    await commandTemplateService.initializeDefaultTemplates();
    console.log('Default command templates initialized');
  } catch (error) {
    console.error('Failed to initialize default command templates:', error.message);
  }

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
