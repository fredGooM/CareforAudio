import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/roles.guard';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Get()
    findAll() {
        return this.groupsService.findAll();
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post()
    create(@Body() body: { name: string }) {
        if (!body.name) throw new BadRequestException('Name is required');
        return this.groupsService.create(body.name);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: { name: string }) {
        if (!body.name) throw new BadRequestException('Nothing to update');
        return this.groupsService.update(id, body.name);
    }
}
