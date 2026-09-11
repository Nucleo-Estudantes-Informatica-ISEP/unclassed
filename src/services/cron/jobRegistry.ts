import type { ScheduledJob } from "./types";

export class JobRegistry {
  private readonly jobs = new Map<string, ScheduledJob>();

  add(job: ScheduledJob) {
    this.jobs.set(job.id, job);
  }

  setEnabled(jobId: string, enabled: boolean) {
    const job = this.jobs.get(jobId);
    if (job) job.enabled = enabled;
    return job;
  }

  get(jobId: string) {
    return this.jobs.get(jobId);
  }

  values() {
    return this.jobs.values();
  }

  status() {
    return Array.from(this.jobs.values()).map((job) => ({
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      enabled: job.enabled,
      isRunning: job.isRunning,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
    }));
  }
}
