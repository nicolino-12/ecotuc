import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para conectar con el frontend web (Next.js) y simulador móvil
  app.enableCors({
    origin: '*', // En producción delimitar a los dominios del cliente
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Validaciones globales automáticas
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Servir archivos cargados (fotografías de basurales) estáticamente
  app.use('/uploads', express.static(join(__dirname, '..', '..', 'uploads')));

  // Configuración de OpenAPI / Swagger para documentación de API REST
  const config = new DocumentBuilder()
    .setTitle('EcoTuc API')
    .setDescription('Especificación de endpoints REST para la gestión inteligente de micro-basurales EcoTuc')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 EcoTuc Backend corriendo en: http://localhost:${port}/api`);
  console.log(`📄 Documentación de API (Swagger) disponible en: http://localhost:${port}/api/docs`);
}
bootstrap();
