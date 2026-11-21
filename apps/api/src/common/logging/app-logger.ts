import { Injectable } from '@nestjs/common';

export type LogFields = Record<string, string | number | boolean | null>;

// Fields are an allow-list by call site: never pass request bodies, auth subjects, emails or health data.
@Injectable()
export class AppLogger {
  info(event: string, fields: LogFields = {}): void {
    this.write(process.stdout, 'info', event, fields);
  }

  error(event: string, fields: LogFields = {}): void {
    this.write(process.stderr, 'error', event, fields);
  }

  private write(stream: NodeJS.WriteStream, level: 'info' | 'error', event: string, fields: LogFields): void {
    stream.write(`${JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })}\n`);
  }
}
