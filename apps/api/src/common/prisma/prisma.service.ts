import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { type AppConfig, CONFIG } from '../../config/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(CONFIG) config: AppConfig) {
    // search_path is set on every connection so that raw SQL resolves to the same schema as model queries.
    super({
      adapter: new PrismaPg(
        { connectionString: config.databaseUrl, options: `-c search_path=${config.databaseSchema}` },
        { schema: config.databaseSchema },
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
