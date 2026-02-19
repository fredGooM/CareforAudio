import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';

@Entity('user_groups')
export class UserGroup {
    @PrimaryColumn()
    userId: string;

    @PrimaryColumn()
    groupId: string;

    @ManyToOne(() => User, (u) => u.groups, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Group, (g) => g.users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'groupId' })
    group: Group;
}
