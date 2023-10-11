import { Column, Entity, PrimaryColumn } from 'typeorm';

export type Session = {
  id: number,
  startTime: string, // format: 00:00
  endTime: string, // format: 00:00
  laps: number; // int
  bestLap: number; // float
  avgSpeedInKmh: number; // float
  time: number; // float
};

@Entity({ name: 'activities' })
export class Activity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'date' })
  date: Date;

  @Column({ name: 'fetched_at' })
  fetchedAt: Date;

  @Column({ name: 'transponder_id' })
  transponderId: string;

  @Column({ type: 'json' })
  sessions: Session[];
}
