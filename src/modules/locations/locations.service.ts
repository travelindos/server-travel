import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Country as CscCountry, State as CscState, City as CscCity } from 'country-state-city';
import Hashids from 'hashids';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LocationResponseModel } from '../../types/response/location.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { Country } from './entities/country.entity';
import { State } from './entities/state.entity';
import { City } from './entities/city.entity';

@Injectable()
export class LocationsService {
  private hashIds: Hashids;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {
    this.hashIds = new Hashids(process.env.ID_SECRET, 10);
  }

  async create(
    createCountryDto: CreateCountryDto,
  ): Promise<LocationResponseModel> {
    // search country by name
    const allCountries = CscCountry.getAllCountries();
    const country = allCountries.find(
      (c) => c.name.toLowerCase() === createCountryDto.name.toLowerCase(),
    );
    if (!country) {
      this.logger.error('Invalid country name');
      throw new BadRequestException('Invalid country name');
    }

    // Cek apakah country sudah ada di DB
    const existing = await this.countryRepository.findOne({
      where: { iso: country.isoCode },
    });
    if (existing) {
      throw new ConflictException('Country already exists');
    }
    // create country
    const newCountry = this.countryRepository.create({
      name: country.name,
      iso: country.isoCode,
      flag: country.flag,
      phone_code: country.phonecode,
      currency: country.currency,
    });
    await this.countryRepository.save(newCountry);

    // Ambil semua city berdasarkan isoCode country
    const states = CscState.getStatesOfCountry(country.isoCode) || [];

    const newStates = states.map((state) => {
      return this.stateRepository.create({
        name: state.name,
        country: {
          id: newCountry.id,
        },
        longitude: state.longitude,
        latitude: state.latitude,
      });
    });

    const savedStates = await this.stateRepository.save(newStates);

    this.logger.debug(`Create country ${country.name} successfully`);

    return {
      message: 'Create country successfully',
      data: {
        id: newCountry.id,
        name: newCountry.name,
        iso: newCountry.iso,
        flag: newCountry.flag,
        phone_code: newCountry.phone_code,
        currency: newCountry.currency,
        states: savedStates.map((state) => {
          return {
            id: state.id,
            name: state.name,
            longitude: state.longitude,
            latitude: state.latitude,
            cities: [],
          };
        }),
      },
    };
  }

  // find all country
  async findAll(): Promise<LocationResponseModel> {
    const countries = await this.countryRepository.find({
      relations: {
        states: {
          cities: true,
        },
      },
    });
    if (countries.length === 0) {
      throw new NotFoundException('Country not found');
    }
    return {
      message: 'Get all country successfully',
      datas: countries.map((country) => {
        return {
          id: country.id,
          name: country.name,
          iso: country.iso,
          flag: country.flag,
          phone_code: country.phone_code,
          currency: country.currency,
          states: country.states?.map((state) => {
            return {
              id: state.id,
              name: state.name,
              longitude: state.longitude,
              latitude: state.latitude,
              cities: state.cities?.map((city) => {
                return {
                  id: city.id,
                  name: city.name,
                  longitude: city.longitude,
                  latitude: city.latitude,
                };
              }) || [],
            };
          }) || [],
        };
      }),
    };
  }

  async findOne(id: string): Promise<LocationResponseModel> {
    const country = await this.countryRepository.findOne({
      where: { id },
      relations: {
        states: {
          cities: true,
        },
      },
    });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    return {
      message: 'Get country successfully',
      data: {
        id: country.id,
        name: country.name,
        iso: country.iso,
        flag: country.flag,
        phone_code: country.phone_code,
        currency: country.currency,
        states: country.states?.map((state) => {
          return {
            id: state.id,
            name: state.name,
            longitude: state.longitude,
            latitude: state.latitude,
            cities: state.cities?.map((city) => {
              return {
                id: city.id,
                name: city.name,
                longitude: city.longitude,
                latitude: city.latitude,
              };
            }) || [],
          };
        }) || [],
      },
    };
  }

  async update(
    id: string,
    updateCountryDto: UpdateCountryDto,
  ): Promise<LocationResponseModel> {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    if (updateCountryDto.name) {
      await this.countryRepository.update(id, { name: updateCountryDto.name });
    }
    const updated = await this.countryRepository.findOne({
      where: { id },
      relations: { states: { cities: true } },
    });
    return {
      message: 'Update country successfully',
      data: {
        id: updated.id,
        name: updated.name,
        iso: updated.iso,
        flag: updated.flag,
        phone_code: updated.phone_code,
        currency: updated.currency,
        states:
          updated.states?.map((state) => ({
            id: state.id,
            name: state.name,
            longitude: state.longitude,
            latitude: state.latitude,
            cities:
              state.cities?.map((city) => ({
                id: city.id,
                name: city.name,
                longitude: city.longitude,
                latitude: city.latitude,
              })) || [],
          })) || [],
      },
    };
  }

  async remove(id: string): Promise<LocationResponseModel> {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    await this.countryRepository.delete(id);
    return {
      message: 'Delete country successfully',
    };
  }

  async seedCountryAndState(countryCode = 'ID'): Promise<void> {
    const allCountries = CscCountry.getAllCountries();
    const countryData = allCountries.find((c) => c.isoCode === countryCode);

    if (!countryData) {
      this.logger.error(
        `Country with code ${countryCode} not found in country-state-city plugin`,
      );
      return;
    }

    let country = await this.countryRepository.findOne({
      where: { iso: countryData.isoCode },
    });

    if (!country) {
      country = this.countryRepository.create({
        iso: countryData.isoCode,
        name: countryData.name,
        flag: countryData.isoCode,
        phone_code: countryData.phonecode,
        currency: countryData.currency,
      });
      await this.countryRepository.save(country);
      this.logger.debug(`Country ${countryData.name} created successfully.`);
    } else {
      this.logger.debug(`Country ${countryData.name} already exists.`);
    }

    // Check states for this country
    let existingStates = await this.stateRepository.find({
      where: { country: { id: country.id } },
    });

    const cscStates = CscState.getStatesOfCountry(countryData.isoCode) || [];

    if (existingStates.length === 0 && cscStates.length > 0) {
      const newStates = cscStates.map((state) => {
        return this.stateRepository.create({
          name: state.name,
          country: country,
          longitude: state.longitude || '0',
          latitude: state.latitude || '0',
        });
      });
      existingStates = await this.stateRepository.save(newStates);
      this.logger.debug(
        `${existingStates.length} states created successfully for ${countryData.name}.`,
      );
    }

    // Check cities for this country
    const existingCitiesCount = await this.cityRepository.count({
      where: { country: { id: country.id } },
    });

    if (existingCitiesCount === 0 && existingStates.length > 0) {
      const citiesToCreate = [];
      for (let i = 0; i < cscStates.length; i++) {
        const stateData = cscStates[i];
        const stateEntity = existingStates[i];
        const cscCities =
          CscCity.getCitiesOfState(countryData.isoCode, stateData.isoCode) || [];

        for (let j = 0; j < cscCities.length; j++) {
          const cscCity = cscCities[j];

          citiesToCreate.push(
            this.cityRepository.create({
              name: cscCity.name,
              state: stateEntity,
              country: country,
              latitude: cscCity.latitude || '0',
              longitude: cscCity.longitude || '0',
            }),
          );
        }
      }

      if (citiesToCreate.length === 0) {
        const countryCities =
          CscCity.getCitiesOfCountry(countryData.isoCode) || [];
        for (let k = 0; k < countryCities.length; k++) {
          const cscCity = countryCities[k];
          citiesToCreate.push(
            this.cityRepository.create({
              name: cscCity.name,
              country: country,
              latitude: cscCity.latitude || '0',
              longitude: cscCity.longitude || '0',
            }),
          );
        }
      }

      if (citiesToCreate.length > 0) {
        await this.cityRepository.save(citiesToCreate, { chunk: 100 });
        this.logger.debug(
          `${citiesToCreate.length} cities created successfully for ${countryData.name}.`,
        );
      }
    }
  }
}
