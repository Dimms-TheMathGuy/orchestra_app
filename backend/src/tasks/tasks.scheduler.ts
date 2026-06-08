import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TasksService } from './tasks.service';

/**
 * Lightweight background poller for Notion task sync.
 *
 * We use the Nest lifecycle hook OnModuleInit (runs once the module's deps are
 * ready) to start a setInterval loop — no extra scheduling dependency needed.
 * OnModuleDestroy clears the timer on shutdown so it doesn't leak in tests/HMR.
 */
@Injectable()
export class TasksScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TasksScheduler');
  private timer?: NodeJS.Timeout;
  private running = false; // prevents overlapping runs if a sync is slow
  private readonly INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  private readonly INITIAL_DELAY_MS = 15 * 1000; // first run shortly after boot

  constructor(private readonly tasks: TasksService) {}

  onModuleInit() {
    setTimeout(() => this.run(), this.INITIAL_DELAY_MS);
    this.timer = setInterval(() => this.run(), this.INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return; // skip if the previous run hasn't finished
    this.running = true;
    try {
      const res = await this.tasks.syncAllProjects();
      if (res.total > 0) {
        this.logger.log(
          `Synced ${res.ok}/${res.total} projects (${res.fail} failed)`,
        );
      }
    } catch (e: any) {
      this.logger.error(`Background sync failed: ${e?.message ?? e}`);
    } finally {
      this.running = false;
    }
  }
}
