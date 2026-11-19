import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { TokenGuard } from './token.guard';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { Member, Row } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Member, Row],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: process.env.WEB_DIR ?? join(__dirname, '..', '..', 'web'),
      exclude: ['/api{*path}'],
    }),
  ],
  controllers: [BankController],
  providers: [BankService, { provide: APP_GUARD, useClass: TokenGuard }],
})
export class AppModule {}
