import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booker } from './entities/booker.entity';
import { CreateBookerDto } from './dto/create-booker.dto';
import { UpdateBookerDto } from './dto/update-booker.dto';

@Injectable()
export class BookersService {
  constructor(
    @InjectRepository(Booker)
    private readonly bookerRepository: Repository<Booker>,
  ) {}

  // ─── Create Booker ─────────────────────────────────────────────────────────
  async createBooker(
    customerId: string,
    dto: CreateBookerDto,
  ): Promise<Booker> {
    return this.findOrCreateBooker(customerId, {
      booker_name: dto.name,
      booker_email: dto.email,
      booker_phone: dto.phone_number,
    });
  }

  // ─── Find or Create Booker (Internal Helper) ───────────────────────────────
  async findOrCreateBooker(
    customerId: string,
    data: {
      booker_id?: string;
      booker_name?: string;
      booker_email?: string;
      booker_phone?: string;
    },
  ): Promise<Booker> {
    if (data.booker_id) {
      const existing = await this.bookerRepository.findOne({
        where: { id: data.booker_id, customer: { id: customerId } },
      });
      if (!existing) {
        throw new HttpException(
          'Booker with specified ID not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return existing;
    }

    if (!data.booker_name || !data.booker_email || !data.booker_phone) {
      throw new HttpException(
        'booker_id or booker_name, booker_email, and booker_phone are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    let booker = await this.bookerRepository.findOne({
      where: [
        { customer: { id: customerId }, email: data.booker_email },
        { customer: { id: customerId }, phone_number: data.booker_phone },
      ],
    });

    if (booker) {
      const hasChanged =
        booker.name !== data.booker_name ||
        booker.email !== data.booker_email ||
        booker.phone_number !== data.booker_phone;

      if (hasChanged) {
        booker.name = data.booker_name;
        booker.email = data.booker_email;
        booker.phone_number = data.booker_phone;
        return await this.bookerRepository.save(booker);
      }
      return booker;
    }

    booker = this.bookerRepository.create({
      customer: { id: customerId },
      name: data.booker_name,
      email: data.booker_email,
      phone_number: data.booker_phone,
    });

    return await this.bookerRepository.save(booker);
  }

  // ─── Find All Customer Bookers ─────────────────────────────────────────────
  async findAllByCustomer(customerId: string): Promise<Booker[]> {
    return await this.bookerRepository.find({
      where: { customer: { id: customerId } },
      order: { created_at: 'DESC' },
    });
  }

  // ─── Find Booker by ID ──────────────────────────────────────────────────────
  async findBookerById(id: string, customerId: string): Promise<Booker> {
    const booker = await this.bookerRepository.findOne({
      where: { id, customer: { id: customerId } },
    });

    if (!booker) {
      throw new HttpException('Booker not found', HttpStatus.NOT_FOUND);
    }

    return booker;
  }

  // ─── Update Booker ──────────────────────────────────────────────────────────
  async updateBooker(
    id: string,
    customerId: string,
    dto: UpdateBookerDto,
  ): Promise<Booker> {
    const booker = await this.findBookerById(id, customerId);

    if (dto.name) booker.name = dto.name;
    if (dto.email) booker.email = dto.email;
    if (dto.phone_number) booker.phone_number = dto.phone_number;

    return await this.bookerRepository.save(booker);
  }

  // ─── Delete Booker ──────────────────────────────────────────────────────────
  async deleteBooker(
    id: string,
    customerId: string,
  ): Promise<{ message: string }> {
    const booker = await this.findBookerById(id, customerId);
    await this.bookerRepository.remove(booker);
    return {
      message: `Delete booker ${id} successfully`,
    };
  }
}
