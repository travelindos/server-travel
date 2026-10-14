import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import { ProfileResponse } from '../../../types/response/profile.type';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // create profile
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: any,
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponse> {
    const result = await this.profilesService.createProfile(
      user.id,
      createProfileDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update profile
  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const result = await this.profilesService.updateProfile(
      user.id,
      id,
      updateProfileDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete profile
  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<ProfileResponse> {
    const result = await this.profilesService.deleteProfile(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // find profile by authenticated user (secure)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async findMyProfile(@CurrentUser() user: any): Promise<ProfileResponse> {
    const userId = user.id; // Get user ID from authenticated token
    const result = await this.profilesService.findProfileByUserId(userId);
    return {
      message: result.message,
      data: result.data,
    };
  }
}
