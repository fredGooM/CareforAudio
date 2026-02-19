import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException(
                'Invalid credentials or inactive account',
            );
        }
        return this.authService.login(user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        const user = await this.authService.getMe(req.user.id);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    async changePassword(
        @Request() req: any,
        @Body() body: { password: string },
    ) {
        if (!body.password || body.password.length < 6) {
            throw new BadRequestException('Password too short');
        }
        return this.authService.changePassword(req.user.id, body.password);
    }
}
