import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ProfileResponse } from '../../../types/response/profile.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';
import { Profile } from '../entities/profile.entity';
import { UsersService } from '../users.service';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly usersService: UsersService,
  ) {}

  // create profile
  async createProfile(userId: string, reqDto: CreateProfileDto): Promise<ProfileResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // creating profile
    const profile = this.profileRepository.create({
      ...reqDto,
      user: {
        id: user.data.id,
      },
    });
    await this.profileRepository.save(profile);
    this.logger.debug('Profile created successfully', profile);
    return {
      message: 'Profile created successfully',
      data: {
        id: profile.id,
        user_id: profile.user.id,
        phone_number: profile.phone_number,
        address: profile.address,
        state: profile.state,
        country: profile.country,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }

  // update profile
  async updateProfile(
    userId: string,
    id: string,
    reqDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    // check user and profile with user relation loaded
    const [findUser, findProfile] = await Promise.all([
      this.usersService.findById(userId),
      this.profileRepository.findOne({
        where: { id },
        relations: ['user'], // Load user relation
      }),
    ]);
    if (!findProfile) {
      throw new NotFoundException('Profile not found');
    }

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    // updating profile
    await this.profileRepository.update(id, {
      phone_number: reqDto.phone_number,
      address: reqDto.address,
      state: reqDto.state,
      country: reqDto.country,
      user: {
        id: findUser.data.id,
      },
    });

    // Fetch updated profile with user relation
    const updatedProfile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    this.logger.debug('Profile updated successfully', updatedProfile);
    return {
      message: 'Profile updated successfully',
      data: {
        id: updatedProfile.id,
        user_id: updatedProfile.user?.id,
        phone_number: updatedProfile.phone_number,
        address: updatedProfile.address,
        state: updatedProfile.state,
        country: updatedProfile.country,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt,
      },
    };
  }

  // delete profile
  async deleteProfile(id: string): Promise<ProfileResponse> {
    const findProfile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!findProfile) {
      throw new NotFoundException('Profile not found');
    }

    await this.profileRepository.delete(id);

    this.logger.debug('Profile deleted successfully', findProfile);
    return {
      message: 'Profile deleted successfully',
      data: {
        id: findProfile.id,
        user_id: findProfile.user?.id,
        phone_number: findProfile.phone_number,
        address: findProfile.address,
        state: findProfile.state,
        country: findProfile.country,
        createdAt: findProfile.createdAt,
        updatedAt: findProfile.updatedAt,
      },
    };
  }

  // find profile by user id
  async findProfileByUserId(userId: string): Promise<ProfileResponse> {
    const findProfile = await this.profileRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: ['user'], // Load the user relation
    });

    if (!findProfile) {
      throw new NotFoundException('Profile not found');
    }

    this.logger.debug('Profile found successfully', findProfile);
    return {
      message: 'Profile found successfully',
      data: {
        id: findProfile.id,
        user_id: findProfile.user?.id,
        phone_number: findProfile.phone_number,
        address: findProfile.address,
        state: findProfile.state,
        country: findProfile.country,
        createdAt: findProfile.createdAt,
        updatedAt: findProfile.updatedAt,
      },
    };
  }
}
