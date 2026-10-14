import Hashids from 'hashids';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum IdempotencyStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

@Entity('idempotency_keys')
@Unique('UQ_idempotency_user_key', ['user_id', 'key'])
@Index(['expires_at'])
export class IdempotencyKey {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET || 'travel_secret', 10).encode(
        Date.now(),
        Math.floor(Math.random() * 10000),
      );
    }
  }

  // Client-generated key (UUID) from the Idempotency-Key header
  @Column({ type: 'varchar', length: 64 })
  key: string;

  // Scopes the key to one user so keys can never be replayed across accounts
  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  request_path: string;

  @Column({ type: 'varchar', length: 16 })
  request_method: string;

  // SHA-256 of the request body: same key + different body => 409
  @Column({ type: 'varchar', length: 64 })
  request_hash: string;

  @Column({
    type: 'enum',
    enum: IdempotencyStatus,
    default: IdempotencyStatus.PROCESSING,
  })
  status: IdempotencyStatus;

  @Column({ type: 'int', nullable: true })
  response_code: number | null;

  @Column({ type: 'json', nullable: true })
  response_body: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime' })
  expires_at: Date;
}
