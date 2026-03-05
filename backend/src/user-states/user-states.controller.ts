import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrTeacherGuard } from '../auth/roles.guard';
import { UserStatesService } from './user-states.service';
import { StateType } from '../entities';

@Controller('user-states')
export class UserStatesController {
    constructor(private readonly svc: UserStatesService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @Request() req: any,
        @Body() body: { type: StateType; data: Record<string, number> },
    ) {
        if (!body.type || !body.data) {
            throw new BadRequestException('type and data are required');
        }
        if (!Object.values(StateType).includes(body.type)) {
            throw new BadRequestException('Invalid state type');
        }
        return this.svc.create(req.user.id, body.type, body.data);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMyStates(
        @Request() req: any,
        @Query('type') type?: StateType,
    ) {
        return this.svc.findByUser(req.user.id, type);
    }

    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Get('user/:userId')
    getUserStates(
        @Param('userId') userId: string,
        @Query('type') type?: StateType,
    ) {
        return this.svc.findByUser(userId, type);
    }
}
