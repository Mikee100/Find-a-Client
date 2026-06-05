import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QUEUE_NAMES } from "src/queue/queue.constants";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>("REDIS_URL")
        }
      })
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.notifications },
      { name: QUEUE_NAMES.media },
      { name: QUEUE_NAMES.reviews }
    )
  ],
  exports: [BullModule]
})
export class QueueModule {}
