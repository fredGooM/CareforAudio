import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @UseGuards(JwtAuthGuard)
    @Post('heartbeat')
    heartbeat(
        @Request() req: any,
        @Body()
        body: {
            audioId: string;
            position: number;
            sessionDuration?: number;
            completed?: boolean;
        },
    ) {
        if (!body.audioId || typeof body.position !== 'number') {
            throw new BadRequestException('Invalid payload');
        }
        return this.analyticsService.heartbeat(req.user.id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    dashboard(@Request() req: any, @Query('userId') filterUserId?: string) {
        return this.analyticsService.getDashboard(
            req.user.role,
            req.user.id,
            filterUserId,
        );
    }
}
