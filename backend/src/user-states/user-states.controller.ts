import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
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

    /** Get field configs for an athlete (auto-inits defaults if missing) */
    @UseGuards(JwtAuthGuard)
    @Get('configs/:athleteId')
    getConfigs(@Param('athleteId') athleteId: string) {
        return this.svc.getConfigs(athleteId);
    }

    /** Teacher sets custom fields for an athlete + type */
    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Put('configs/:athleteId/:stateType')
    setConfigs(
        @Param('athleteId') athleteId: string,
        @Param('stateType') stateType: StateType,
        @Body() body: { fields: { fieldKey: string; label: string }[] },
    ) {
        if (!Object.values(StateType).includes(stateType)) {
            throw new BadRequestException('Invalid state type');
        }
        if (!body.fields?.length) {
            throw new BadRequestException('At least one field is required');
        }
        return this.svc.setConfigs(athleteId, stateType, body.fields);
    }

    /** Athlete submits their state values */
    @UseGuards(JwtAuthGuard)
    @Post('submit')
    submit(
        @Request() req: any,
        @Body() body: { entries: { fieldConfigId: string; value: number }[] },
    ) {
        if (!body.entries?.length) throw new BadRequestException('entries required');
        return this.svc.submitValues(req.user.id, body.entries);
    }

    /** Teacher submits state values for an athlete */
    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Post('submit-for/:athleteId')
    submitFor(
        @Param('athleteId') athleteId: string,
        @Body() body: { entries: { fieldConfigId: string; value: number }[] },
    ) {
        if (!body.entries?.length) throw new BadRequestException('entries required');
        return this.svc.submitValues(athleteId, body.entries);
    }

    /** Get history for current athlete */
    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMyHistory(@Request() req: any) {
        return this.svc.getHistory(req.user.id);
    }

    /** Teacher gets history for an athlete */
    @UseGuards(JwtAuthGuard, AdminOrTeacherGuard)
    @Get('user/:athleteId')
    getUserHistory(@Param('athleteId') athleteId: string) {
        return this.svc.getHistory(athleteId);
    }
}
