import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('app_config')
export class AppConfig {
    @PrimaryColumn()
    key: string;

    @Column()
    value: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
