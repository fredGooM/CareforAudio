import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { AudioTrack } from './audio-track.entity';

@Entity('audio_access')
export class AudioAccess {
    @PrimaryColumn()
    userId: string;

    @PrimaryColumn()
    audioId: string;

    @ManyToOne(() => User, (u) => u.audioAccesses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => AudioTrack, (a) => a.allowedUsers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audioId' })
    audio: AudioTrack;
}
