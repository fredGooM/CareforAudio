import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrTeacherGuard } from '../auth/roles.guard';
import { ProgramsService } from './programs.service';

@Controller('programs')
@UseGuards(JwtAuthGuard)
export class ProgramsController {
    constructor(private readonly programsService: ProgramsService) {}

    @Get()
    findAll(@Request() req: any) {
        return this.programsService.findAll(req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.programsService.findOne(id, req.user);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Post()
    create(@Body() body: any, @Request() req: any) {
        return this.programsService.create(body, req.user);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.programsService.update(id, body, req.user);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.programsService.remove(id, req.user);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Post(':id/share')
    shareProgram(@Param('id') id: string, @Body() body: { userId: string }, @Request() req: any) {
        return this.programsService.shareProgram(id, body.userId, req.user);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Get(':id/share')
    getShares(@Param('id') id: string) {
        return this.programsService.getShares(id);
    }

    @UseGuards(AdminOrTeacherGuard)
    @Delete(':id/share/:userId')
    removeShare(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
        return this.programsService.removeShare(id, userId, req.user);
    }
}
