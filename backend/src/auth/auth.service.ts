import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { RefreshToken } from '../entities';
import { UserGroup } from '../entities';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepo: Repository<RefreshToken>,
        @InjectRepository(UserGroup)
        private readonly userGroupRepo: Repository<UserGroup>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepo.findOne({ where: { email } });
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return user;
    }

    async login(user: User) {
        const accessToken = this.jwtService.sign(
            { id: user.id, role: user.role },
            {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
            },
        );
        const refreshToken = this.jwtService.sign(
            { id: user.id },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
            },
        );

        await this.refreshTokenRepo.save({
            tokenHash: refreshToken,
            userId: user.id,
        });

        const groups = await this.userGroupRepo.find({
            where: { userId: user.id },
        });
        const groupIds = groups.map((ug) => ug.groupId);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                mustChangePassword: user.mustChangePassword,
                groupIds,
                avatar: user.avatar,
                gender: user.gender,
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) return null;

        const groups = await this.userGroupRepo.find({
            where: { userId: user.id },
        });
        const groupIds = groups.map((ug) => ug.groupId);

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            groupIds,
            avatar: user.avatar,
        };
    }

    async changePassword(userId: string, newPassword: string) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.update(userId, {
            passwordHash: hash,
            mustChangePassword: false,
        });
        return { success: true };
    }
}
