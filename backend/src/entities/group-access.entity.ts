import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Group } from './group.entity';
import { AudioTrack } from './audio-track.entity';

@Entity('group_access')
export class GroupAccess {
    @PrimaryColumn()
    groupId: string;

    @PrimaryColumn()
    audioId: string;

    @ManyToOne(() => Group, (g) => g.audios, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupId' })
    group: Group;

    @ManyToOne(() => AudioTrack, (a) => a.allowedGroups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audioId' })
    audio: AudioTrack;
}
