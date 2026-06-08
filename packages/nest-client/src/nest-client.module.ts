import { DynamicModule, Module } from '@nestjs/common';
import { NestClientOptions } from './config';
import { NEST_CLIENT_OPTIONS } from './logger';
import { AuthModule } from './auth';
import { DatabaseModule } from './infrastructure';
import { NestRedisModule } from './infrastructure';

@Module({})
export class NestClientModule {
  static forRoot(options?: NestClientOptions): DynamicModule {
    const providers: any[] = [];

    if (options) {
      providers.push({
        provide: NEST_CLIENT_OPTIONS,
        useValue: options,
      });
    }

    const imports = [];
    // 始终导入数据库和 Redis 模块（它们会通过 options 自行初始化）
    imports.push(DatabaseModule, NestRedisModule, AuthModule);

    return {
      module: NestClientModule,
      global: options?.isGlobal !== false,
      imports,
      providers,
      exports: [NEST_CLIENT_OPTIONS, ...providers],
    };
  }
}
