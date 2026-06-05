import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "src/queue/queue.constants";

@Injectable()
@Processor(QUEUE_NAMES.media)
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing media job: ${job.name}`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.notifications)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing notification job: ${job.name}`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.reviews)
export class ReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing review job: ${job.name}`);
  }
}
