import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserGroup } from './user-group.entity';
import { GroupAccess } from './group-access.entity';

@Entity('groups')
export class Group {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => UserGroup, (ug) => ug.group)
    users: UserGroup[];

    @OneToMany(() => GroupAccess, (ga) => ga.group)
    audios: GroupAccess[];
}
