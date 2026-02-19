import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/roles.guard';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.categoriesService.findAll();
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post()
    create(@Body() body: { name: string; color?: string; image?: string }) {
        if (!body.name) throw new BadRequestException('Name is required');
        return this.categoriesService.create(body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.categoriesService.update(id, body);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Post(':id/image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async uploadImage(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('No file uploaded');
        const result = await this.categoriesService.uploadImage(id, file);
        if (!result) throw new NotFoundException('Category not found');
        return result;
    }
}
