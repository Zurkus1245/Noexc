import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppLogger } from './logging/app-logger';
import { ProblemFilter } from './errors/problem.filter';
import { PrismaService } from './prisma/prisma.service';

@Global()
@Module({
  providers: [AppLogger, PrismaService, { provide: APP_FILTER, useClass: ProblemFilter }],
  exports: [AppLogger, PrismaService],
})
export class CommonModule {}
