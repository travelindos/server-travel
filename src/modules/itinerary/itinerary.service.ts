import { HttpException, HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseItinerary } from '../../types/response/itinerary.type';
import { Country } from '../locations/entities/country.entity';
import { State } from '../locations/entities/state.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Destination } from '../destination/entities/destination.entity';
import { AddItineraryItemDto } from './dto/add-itinerary-item.dto';
import { ItineraryItem } from './entities/itinerary-item.entity';
import { Itinerary, StatusItinerary } from './entities/itinerary.entity';

const ITINERARY_FULL_RELATIONS = [
  'customer',
  'country',
  'state',
  'itinerary_items',
  'itinerary_items.destination',
  'itinerary_items.destination.translations',
  'itinerary_items.destination.category_destination',
  'itinerary_items.destination.state',
  'itinerary_items.destination.state.country',
];

@Injectable()
export class ItineraryService implements OnModuleInit {
  constructor(
    @InjectRepository(Itinerary)
    private readonly itineraryRepository: Repository<Itinerary>,
    @InjectRepository(ItineraryItem)
    private readonly itineraryItemRepository: Repository<ItineraryItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Destination)
    private readonly destinationRepository: Repository<Destination>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
  ) {}

  // Automatic backfill for existing itineraries with empty/null name on start
  async onModuleInit() {
    try {
      const itinerariesToUpdate = await this.itineraryRepository.find({
        where: [
          { name: null as any },
          { name: '' },
        ],
        relations: ['country', 'state'],
      });

      if (itinerariesToUpdate.length > 0) {
        for (const itinerary of itinerariesToUpdate) {
          const fallbackName = itinerary.country?.name
            ? `Trip to ${itinerary.country.name}`
            : itinerary.state?.name
              ? `Trip to ${itinerary.state.name}`
              : `Trip Wisata`;
          itinerary.name = fallbackName;
        }
        await this.itineraryRepository.save(itinerariesToUpdate);
        console.log(`[ItineraryService] Automatically backfilled ${itinerariesToUpdate.length} itinerary names.`);
      }
    } catch (err) {
      console.error('[ItineraryService] Failed to backfill itinerary names:', err);
    }
  }

  // ─── Add or Create Itinerary Item (Optimized Batch & Zero N+1) ───────────────
  async addOrCreateItem(
    customerId: string,
    dto: AddItineraryItemDto,
  ): Promise<ResponseItinerary> {
    const destination = await this.destinationRepository.findOne({
      where: { id: dto.destination_id },
      relations: ['state', 'state.country'],
    });

    if (!destination || !destination.state || !destination.state.country) {
      throw new HttpException(
        'Destination or associated location not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const countryId = destination.state.country.id;
    const stateId = destination.state.id;

    // Reset visit date comparison to local date start
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const visitDate = new Date(dto.visit_date);
    const visitDateStart = new Date(
      visitDate.getFullYear(),
      visitDate.getMonth(),
      visitDate.getDate(),
    );

    if (visitDateStart < today) {
      throw new HttpException(
        'Visit date cannot be earlier than today',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format date string YYYY-MM-DD
    const INDONESIA_OFFSET_MS = 7 * 60 * 60 * 1000;
    const indonesianDate = new Date(visitDate.getTime() + INDONESIA_OFFSET_MS);
    const visitDateStr = indonesianDate.toISOString().split('T')[0];

    // Find existing DRAFT itinerary for this customer in exact same country & state
    let itinerary = await this.itineraryRepository.findOne({
      where: {
        customer: { id: customerId },
        country: { id: countryId },
        state: { id: stateId },
        status: StatusItinerary.DRAFT,
      },
      relations: ['itinerary_items'],
    });

    const defaultName = dto.name || `Trip to ${destination.state.country.name}`;

    if (itinerary) {
      // Visit date validation within the same itinerary
      if (itinerary.itinerary_items && itinerary.itinerary_items.length > 0) {
        for (const item of itinerary.itinerary_items) {
          const itemYMD =
            typeof item.visit_date === 'string'
              ? item.visit_date
              : new Date(item.visit_date).toISOString().split('T')[0];

          if (visitDateStr === itemYMD) {
            throw new HttpException(
              'Visit date is already used by another destination in this itinerary',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (visitDateStr < itemYMD) {
            throw new HttpException(
              'Visit date for new destination cannot be earlier than existing destinations in this itinerary',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }

      if (dto.name) {
        itinerary.name = dto.name;
      }
      itinerary.subtotal =
        Number(itinerary.subtotal) + Number(destination.price || 0);
    } else {
      itinerary = this.itineraryRepository.create({
        name: defaultName,
        customer: { id: customerId },
        country: { id: countryId },
        state: { id: stateId },
        status: StatusItinerary.DRAFT,
        subtotal: Number(destination.price || 0),
        edit_count: 0,
      });
    }

    await this.itineraryRepository.save(itinerary);

    const itineraryItem = this.itineraryItemRepository.create({
      itinerary: { id: itinerary.id },
      destination: { id: destination.id },
      visit_date: visitDateStr as any,
    });

    await this.itineraryItemRepository.save(itineraryItem);

    return this.findItineraryById(customerId, itinerary.id);
  }

  // ─── Remove Item from Itinerary (Parallel Async Deletion) ────────────────────
  async removeItem(
    customerId: string,
    itineraryId: string,
    itemId: string,
  ): Promise<ResponseItinerary> {
    const itinerary = await this.itineraryRepository.findOne({
      where: {
        id: itineraryId,
        customer: { id: customerId },
      },
      relations: ['itinerary_items', 'itinerary_items.destination'],
    });

    if (!itinerary) {
      throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
    }

    if (itinerary.status !== StatusItinerary.DRAFT) {
      throw new HttpException(
        'Cannot remove items from an itinerary that is not in DRAFT status',
        HttpStatus.BAD_REQUEST,
      );
    }

    const item = itinerary.itinerary_items?.find(
      (i) =>
        i.destination?.id === itemId ||
        i.id === itemId,
    );

    if (!item) {
      throw new HttpException(
        `Itinerary item or destination ${itemId} not found in this itinerary`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.itineraryItemRepository.delete(item.id);

    const remainingItems = (itinerary.itinerary_items || []).filter(
      (i) => i.id !== item.id && i.destination?.id !== itemId,
    );

    const newSubtotal = remainingItems.reduce(
      (sum, cur) => sum + Number(cur.destination?.price || 0),
      0,
    );
    itinerary.subtotal = newSubtotal;
    itinerary.itinerary_items = remainingItems;

    await this.itineraryRepository.save(itinerary);

    return this.findItineraryById(customerId, itineraryId);
  }

  // ─── Delete Master Itinerary ────────────────────────────────────────────────
  async deleteItinerary(
    customerId: string,
    itineraryId: string,
  ): Promise<{ message: string }> {
    const itinerary = await this.itineraryRepository.findOne({
      where: {
        id: itineraryId,
        customer: { id: customerId },
      },
      relations: ['itinerary_items'],
    });

    if (!itinerary) {
      throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
    }

    if (itinerary.status === StatusItinerary.CONFIRMED) {
      throw new HttpException(
        'Cannot delete a confirmed booking itinerary',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (itinerary.itinerary_items && itinerary.itinerary_items.length > 0) {
      await this.itineraryItemRepository.remove(itinerary.itinerary_items);
    }
    await this.itineraryRepository.remove(itinerary);

    return {
      message: `Delete itinerary ${itineraryId} successfully`,
    };
  }

  // ─── Update Itinerary Items / Name ───
  async updateItinerary(
    customerId: string,
    itineraryId: string,
    payload: any,
  ): Promise<ResponseItinerary> {
    const itinerary = await this.itineraryRepository.findOne({
      where: {
        id: itineraryId,
        customer: { id: customerId },
      },
      relations: ['itinerary_items', 'itinerary_items.destination'],
    });

    if (!itinerary) {
      throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
    }

    if (
      itinerary.status !== StatusItinerary.DRAFT &&
      itinerary.status !== StatusItinerary.CONFIRMED
    ) {
      throw new HttpException(
        `Cannot update itinerary with status ${itinerary.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update name if provided in payload
    if (payload && payload.name) {
      itinerary.name = payload.name;
    }

    let rawItems: any[] = [];
    if (Array.isArray(payload)) {
      rawItems = payload;
    } else if (payload && Array.isArray(payload.items)) {
      rawItems = payload.items;
    } else if (payload && (payload.destination_id || payload.item_id || payload.visit_date)) {
      rawItems = [payload];
    }

    if (rawItems.length > 0) {
      // Maximum 2 edits allowed for CONFIRMED itineraries
      if (itinerary.status === StatusItinerary.CONFIRMED) {
        if (itinerary.edit_count >= 2) {
          throw new HttpException(
            'Maximum 2 itinerary modifications allowed after booking confirmation',
            HttpStatus.BAD_REQUEST,
          );
        }
        itinerary.edit_count += 1;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const INDONESIA_OFFSET_MS = 7 * 60 * 60 * 1000;
      const dateMap = new Map<string, string>();

      const itemsToUpdate: ItineraryItem[] = [];

      // Single item update with smart date swap if collision occurs
      if (rawItems.length === 1) {
        const updateItem = rawItems[0];
        const destId = updateItem.destination_id || updateItem.item_id;
        const targetItem = itinerary.itinerary_items?.find(
          (i) => i.destination?.id === destId || i.id === destId,
        );

        if (!targetItem) {
          throw new HttpException(
            `Destination ${destId} not found in this itinerary`,
            HttpStatus.NOT_FOUND,
          );
        }

        const inputDate = new Date(updateItem.visit_date);
        const visitDateStart = new Date(
          inputDate.getFullYear(),
          inputDate.getMonth(),
          inputDate.getDate(),
        );

        if (visitDateStart < today) {
          throw new HttpException(
            'Visit date cannot be earlier than today',
            HttpStatus.BAD_REQUEST,
          );
        }

        const indonesianDate = new Date(inputDate.getTime() + INDONESIA_OFFSET_MS);
        const newVisitDateStr = indonesianDate.toISOString().split('T')[0];
        const oldTargetDateStr =
          typeof targetItem.visit_date === 'string'
            ? targetItem.visit_date
            : new Date(targetItem.visit_date).toISOString().split('T')[0];

        // Check if another item in the same itinerary has this date
        const clashingItem = itinerary.itinerary_items?.find(
          (i) =>
            i.id !== targetItem.id &&
            (typeof i.visit_date === 'string'
              ? i.visit_date
              : new Date(i.visit_date).toISOString().split('T')[0]) ===
              newVisitDateStr,
        );

        targetItem.visit_date = newVisitDateStr as any;
        itemsToUpdate.push(targetItem);

        if (clashingItem) {
          // Smart Date Swap: swap clashing item's date with target item's previous date
          clashingItem.visit_date = oldTargetDateStr as any;
          itemsToUpdate.push(clashingItem);
        }
      } else {
        // Multiple items batch update
        for (const updateItem of rawItems) {
          const destId = updateItem.destination_id || updateItem.item_id;
          if (!destId || !updateItem.visit_date) {
            throw new HttpException(
              'Each update item must contain destination_id and visit_date',
              HttpStatus.BAD_REQUEST,
            );
          }

          const existingItem = itinerary.itinerary_items?.find(
            (i) => i.destination?.id === destId || i.id === destId,
          );

          if (!existingItem) {
            throw new HttpException(
              `Destination ${destId} not found in this itinerary`,
              HttpStatus.NOT_FOUND,
            );
          }

          const inputDate = new Date(updateItem.visit_date);
          const visitDateStart = new Date(
            inputDate.getFullYear(),
            inputDate.getMonth(),
            inputDate.getDate(),
          );

          if (visitDateStart < today) {
            throw new HttpException(
              'Visit date cannot be earlier than today',
              HttpStatus.BAD_REQUEST,
            );
          }

          const indonesianDate = new Date(
            inputDate.getTime() + INDONESIA_OFFSET_MS,
          );
          const visitDateStr = indonesianDate.toISOString().split('T')[0];

          if (dateMap.has(visitDateStr)) {
            throw new HttpException(
              `Multiple items cannot have the same visit date (${visitDateStr})`,
              HttpStatus.BAD_REQUEST,
            );
          }
          dateMap.set(visitDateStr, destId);

          existingItem.visit_date = visitDateStr as any;
          itemsToUpdate.push(existingItem);
        }
      }

      await Promise.all([
        this.itineraryItemRepository.save(itemsToUpdate),
        this.itineraryRepository.save(itinerary),
      ]);
    } else {
      await this.itineraryRepository.save(itinerary);
    }

    return this.findItineraryById(customerId, itineraryId);
  }

  // ─── Find Customer Itineraries ───────────────────────────────────────────────
  async findCustomerItineraries(customerId: string): Promise<ResponseItinerary> {
    const itineraries = await this.itineraryRepository.find({
      where: { customer: { id: customerId } },
      relations: ITINERARY_FULL_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Find customer itineraries successfully',
      datas: itineraries.map((item) => this.mapToItineraryResponse(item)),
    };
  }

  // ─── Find Itinerary by ID ───────────────────────────────────────────────────
  async findItineraryById(
    customerId: string,
    itineraryId: string,
  ): Promise<ResponseItinerary> {
    const itinerary = await this.itineraryRepository.findOne({
      where: {
        id: itineraryId,
        customer: { id: customerId },
      },
      relations: ITINERARY_FULL_RELATIONS,
    });

    if (!itinerary) {
      throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Find detail itinerary successfully',
      data: this.mapToItineraryResponse(itinerary),
    };
  }

  // ─── Helper Mapper ─────────────────────────────────────────────────────────
  private mapToItineraryResponse(itinerary: Itinerary) {
    const editCount = itinerary.edit_count || 0;
    const canEdit =
      itinerary.status === StatusItinerary.DRAFT ||
      (itinerary.status === StatusItinerary.CONFIRMED && editCount < 2);

    const sortedItems = [...(itinerary.itinerary_items || [])].sort((a, b) => {
      const dateA =
        typeof a.visit_date === 'string'
          ? a.visit_date
          : new Date(a.visit_date).toISOString().split('T')[0];
      const dateB =
        typeof b.visit_date === 'string'
          ? b.visit_date
          : new Date(b.visit_date).toISOString().split('T')[0];
      return dateA.localeCompare(dateB);
    });

    const locationName = itinerary.state?.name
      ? `${itinerary.state.name}, ${itinerary.country?.name || ''}`
      : itinerary.country?.name || '';

    const itineraryName = itinerary.name || `Trip to ${itinerary.country?.name || locationName || 'Wisata'}`;

    return {
      id: itinerary.id,
      name: itineraryName,
      customer_id: itinerary.customer?.id || '',
      country_id: itinerary.country?.id || '',
      country_name: itinerary.country?.name || '',
      country: itinerary.country
        ? { id: itinerary.country.id, name: itinerary.country.name }
        : undefined,
      state_id: itinerary.state?.id || '',
      state_name: itinerary.state?.name || '',
      state: itinerary.state
        ? { id: itinerary.state.id, name: itinerary.state.name }
        : undefined,
      location: locationName,
      status: itinerary.status,
      subtotal: Number(itinerary.subtotal),
      edit_count: editCount,
      max_edits: 2,
      can_edit: canEdit,
      createdAt: itinerary.createdAt,
      updatedAt: itinerary.updatedAt,
      itinerary_items: sortedItems.map((item) => ({
        id: item.id,
        destination_id: item.destination?.id || '',
        visit_date:
          typeof item.visit_date === 'string'
            ? item.visit_date
            : new Date(item.visit_date).toISOString().split('T')[0],
        createdAt: item.createdAt,
        destination: item.destination
          ? {
              id: item.destination.id,
              price: Number(item.destination.price),
              thumbnail: item.destination.thumbnail,
              images: item.destination.images,
              location: item.destination.state?.country?.name
                ? `${item.destination.state?.name}, ${item.destination.state?.country?.name}`
                : item.destination.state?.name || '',
              category_destination_name:
                item.destination.category_destination?.name || '',
              translations: item.destination.translations,
            }
          : undefined,
      })),
    };
  }
}
