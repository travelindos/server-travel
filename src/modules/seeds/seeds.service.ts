import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Country as CscCountry, State as CscState } from 'country-state-city';
import Hashids from 'hashids';
import { Repository } from 'typeorm';
import { LocationsService } from '../locations/locations.service';
import { CategoryDestination } from '../destination/entities/category_destination.entity';
import { Roles } from '../users/entities/role.entity';
import { Permission } from '../users/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { Merek } from '../motors/entities/merek.entity';
import { Motor } from '../motors/entities/motor.entity';
import { MotorTranslation } from '../motors/entities/motor-translation.entity';
import { Variant } from '../motors/entities/variant.entity';
import { MotorPrice, PriceType } from '../motors/entities/motor-price.entity';
import { State } from '../locations/entities/state.entity';
import { Country } from '../locations/entities/country.entity';
import { DocumentCategory } from '../document-visas/entities/document-category.entity';

@Injectable()
export class SeedsService implements OnModuleInit {
  constructor(
    @InjectRepository(CategoryDestination)
    private readonly categoryDestinationRepository: Repository<CategoryDestination>,
    @InjectRepository(Roles)
    private readonly roleRepository: Repository<Roles>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Merek)
    private readonly merekRepository: Repository<Merek>,
    @InjectRepository(Motor)
    private readonly motorRepository: Repository<Motor>,
    @InjectRepository(MotorTranslation)
    private readonly translationRepository: Repository<MotorTranslation>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(MotorPrice)
    private readonly priceRepository: Repository<MotorPrice>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(DocumentCategory)
    private readonly documentCategoryRepository: Repository<DocumentCategory>,
    private readonly locationsService: LocationsService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedDeveloperUser();
    await this.seedCountryAndState();
    await this.seedCategoryDestination();
    await this.seedDocumentCategories();
    await this.seedMotorBrands();
    await this.seedMotors();
  }

  // seed permissions
  async seedPermissions() {
    const defaultPermissions = [
      { name: 'All Access', code: '*', group: 'system', description: 'Full system access' },
      // Users
      { name: 'Create Users', code: 'users:create', group: 'users', description: 'Create new users' },
      { name: 'Read Users', code: 'users:read', group: 'users', description: 'View company users' },
      { name: 'Update Users', code: 'users:update', group: 'users', description: 'Update existing users' },
      { name: 'Delete Users', code: 'users:delete', group: 'users', description: 'Delete users' },
      // Roles
      { name: 'Create Roles', code: 'roles:create', group: 'roles', description: 'Create new roles' },
      { name: 'Read Roles', code: 'roles:read', group: 'roles', description: 'View roles' },
      { name: 'Update Roles', code: 'roles:update', group: 'roles', description: 'Update existing roles' },
      { name: 'Delete Roles', code: 'roles:delete', group: 'roles', description: 'Delete roles' },
      // Permissions
      { name: 'Create Permissions', code: 'permissions:create', group: 'permissions', description: 'Create new permissions' },
      { name: 'Read Permissions', code: 'permissions:read', group: 'permissions', description: 'View permissions' },
      { name: 'Update Permissions', code: 'permissions:update', group: 'permissions', description: 'Update existing permissions' },
      { name: 'Delete Permissions', code: 'permissions:delete', group: 'permissions', description: 'Delete permissions' },
      // Destinations
      { name: 'Create Destinations', code: 'destinations:create', group: 'destinations', description: 'Create destinations' },
      { name: 'Read Destinations', code: 'destinations:read', group: 'destinations', description: 'View destinations' },
      { name: 'Update Destinations', code: 'destinations:update', group: 'destinations', description: 'Update destinations' },
      { name: 'Delete Destinations', code: 'destinations:delete', group: 'destinations', description: 'Delete destinations' },
      // Entertainment Attractions
      { name: 'Create Entertainment Attractions', code: 'entertainment-attractions:create', group: 'entertainment-attractions', description: 'Create entertainment attractions' },
      { name: 'Read Entertainment Attractions', code: 'entertainment-attractions:read', group: 'entertainment-attractions', description: 'View entertainment attractions' },
      { name: 'Update Entertainment Attractions', code: 'entertainment-attractions:update', group: 'entertainment-attractions', description: 'Update entertainment attractions' },
      { name: 'Delete Entertainment Attractions', code: 'entertainment-attractions:delete', group: 'entertainment-attractions', description: 'Delete entertainment attractions' },
      // Countries
      { name: 'Create Countries', code: 'countries:create', group: 'countries', description: 'Create countries' },
      { name: 'Read Countries', code: 'countries:read', group: 'countries', description: 'View countries' },
      { name: 'Update Countries', code: 'countries:update', group: 'countries', description: 'Update countries' },
      { name: 'Delete Countries', code: 'countries:delete', group: 'countries', description: 'Delete countries' },
      // Add-ons
      { name: 'Create Add-ons', code: 'addons:create', group: 'addons', description: 'Create add-ons' },
      { name: 'Read Add-ons', code: 'addons:read', group: 'addons', description: 'View add-ons' },
      { name: 'Update Add-ons', code: 'addons:update', group: 'addons', description: 'Update add-ons' },
      { name: 'Delete Add-ons', code: 'addons:delete', group: 'addons', description: 'Delete add-ons' },
      // Tourists
      { name: 'Create Tourists', code: 'tourists:create', group: 'tourists', description: 'Create tourists' },
      { name: 'Read Tourists', code: 'tourists:read', group: 'tourists', description: 'View tourists' },
      { name: 'Update Tourists', code: 'tourists:update', group: 'tourists', description: 'Update tourists' },
      { name: 'Delete Tourists', code: 'tourists:delete', group: 'tourists', description: 'Delete tourists' },
      // Motors
      { name: 'Create Motors', code: 'motors:create', group: 'motors', description: 'Create motors' },
      { name: 'Read Motors', code: 'motors:read', group: 'motors', description: 'View motors' },
      { name: 'Update Motors', code: 'motors:update', group: 'motors', description: 'Update motors' },
      { name: 'Delete Motors', code: 'motors:delete', group: 'motors', description: 'Delete motors' },
      // Motor Brands
      { name: 'Create Motor Brands', code: 'motor-brands:create', group: 'motor-brands', description: 'Create motor brands' },
      { name: 'Read Motor Brands', code: 'motor-brands:read', group: 'motor-brands', description: 'View motor brands' },
      { name: 'Update Motor Brands', code: 'motor-brands:update', group: 'motor-brands', description: 'Update motor brands' },
      { name: 'Delete Motor Brands', code: 'motor-brands:delete', group: 'motor-brands', description: 'Delete motor brands' },
      // Book Tours
      { name: 'Create Book Tours', code: 'book-tours:create', group: 'book-tours', description: 'Create tour bookings' },
      { name: 'Read Book Tours', code: 'book-tours:read', group: 'book-tours', description: 'View tour bookings' },
      { name: 'Update Book Tours', code: 'book-tours:update', group: 'book-tours', description: 'Update tour bookings' },
      { name: 'Delete Book Tours', code: 'book-tours:delete', group: 'book-tours', description: 'Delete tour bookings' },
      { name: 'Update Status Book Tours', code: 'book-tours:update-status', group: 'book-tours', description: 'Update tour booking status' },
      // Book Motors
      { name: 'Create Book Motors', code: 'book-motors:create', group: 'book-motors', description: 'Create motor bookings' },
      { name: 'Read Book Motors', code: 'book-motors:read', group: 'book-motors', description: 'View motor bookings' },
      { name: 'Update Book Motors', code: 'book-motors:update', group: 'book-motors', description: 'Update motor bookings' },
      { name: 'Delete Book Motors', code: 'book-motors:delete', group: 'book-motors', description: 'Delete motor bookings' },
      { name: 'Update Status Book Motors', code: 'book-motors:update-status', group: 'book-motors', description: 'Update motor booking status' },
      // Payments
      { name: 'Create Payments', code: 'payments:create', group: 'payments', description: 'Create payments' },
      { name: 'Read Payments', code: 'payments:read', group: 'payments', description: 'View payments' },
      { name: 'Update Payments', code: 'payments:update', group: 'payments', description: 'Update payments' },
      { name: 'Delete Payments', code: 'payments:delete', group: 'payments', description: 'Delete payments' },
      { name: 'Capture Payments', code: 'payments:capture', group: 'payments', description: 'Capture payments' },
      { name: 'Cancel Payments', code: 'payments:cancel', group: 'payments', description: 'Cancel payments' },
      // Sales
      { name: 'Read Sales', code: 'sales:read', group: 'sales', description: 'View sales and reports' },
    ];

    for (const permData of defaultPermissions) {
      const existing = await this.permissionRepository.findOneBy({ code: permData.code });
      if (!existing) {
        const newPerm = this.permissionRepository.create(permData);
        await this.permissionRepository.save(newPerm);
        console.log(`Permission ${permData.name} created successfully.`);
      }
    }
  }

  // seed roles
  async seedRoles() {
    const defaultRoles = [
      {
        name: 'Owner',
        code: 'owner',
        level: 100,
        self_register: true,
        permissions: ['*'],
        description: 'Company owner with full access',
      },
      {
        name: 'Developer',
        code: 'developer',
        level: 100,
        self_register: false,
        permissions: ['*'],
        description: 'System developer role',
      },
      {
        name: 'Admin',
        code: 'admin',
        level: 80,
        self_register: false,
        permissions: [
          'users:*',
          'roles:*',
          'permissions:*',
          'destinations:*',
          'entertainment-attractions:*',
          'countries:*',
          'addons:*',
          'tourists:*',
          'motors:*',
          'motor-brands:*',
          'book-tours:*',
          'book-motors:*',
          'book-entertainment-attractions:*',
          'document-visas:*',
          'book-document-visas:*',
          'payments:*',
          'sales:*',
        ],
        description: 'Administrator role for internal management',
      },
      {
        name: 'Guide',
        code: 'guide',
        level: 60,
        self_register: false,
        permissions: ['book-tours:read', 'book-motors:read', 'motors:read', 'destinations:read'],
        description: 'Tour guide role with read-only access to assignments',
      },
    ];

    // Clean up legacy 'traveller' role if exists in internal RBAC table
    const legacyTraveller = await this.roleRepository.findOneBy({
      code: 'traveller',
    });
    if (legacyTraveller) {
      await this.roleRepository.remove(legacyTraveller);
      console.log('Legacy Traveller role removed from internal RBAC roles table.');
    }

    for (const roleData of defaultRoles) {
      const existingRole = await this.roleRepository.findOneBy({
        code: roleData.code,
      });

      if (!existingRole) {
        const newRole = this.roleRepository.create(roleData);
        await this.roleRepository.save(newRole);
        console.log(`Role ${roleData.name} created successfully.`);
      } else if (!existingRole.permissions) {
        existingRole.permissions = roleData.permissions;
        await this.roleRepository.save(existingRole);
      }
    }
  }

  // seed developer user
  async seedDeveloperUser() {
    const developerEmail = 'travelindo@gmail.com';
    const developerRole = await this.roleRepository.findOneBy({
      code: 'developer',
    });

    if (!developerRole) {
      console.log('Role Developer not found, skipping developer user seed.');
      return;
    }

    const existingUser = await this.userRepository.findOneBy({
      email: developerEmail,
    });

    if (!existingUser) {
      const hashIds = new Hashids(process.env.ID_SECRET, 10);
      const hashPassword = await bcrypt.hash('Omah1suro!', 10);

      const newUser = this.userRepository.create({
        id: hashIds.encode(Date.now()),
        name: 'Developer',
        email: developerEmail,
        password: hashPassword,
        role: developerRole,
        is_verified: true,
      });

      await this.userRepository.save(newUser);
      console.log(`User Developer created successfully.`);
    } else {
      console.log(`User Developer already exists.`);
    }
  }

  // seed country & state
  async seedCountryAndState() {
    const countriesToSeed = ['ID', 'TR']; // Indonesia dan Turkey
    for (const countryCode of countriesToSeed) {
      await this.locationsService.seedCountryAndState(countryCode);
    }
  }

  // seed category destination
  async seedCategoryDestination() {
    const defaultCategoryDestination = [
      { name: 'Religion', code: 'religion' },
      { name: 'Adventure', code: 'adventure' },
      { name: 'Culture', code: 'culture' },
      { name: 'Traveling', code: 'traveling' },
    ];

    for (const categoryDestinationData of defaultCategoryDestination) {
      const existingCategoryDestination =
        await this.categoryDestinationRepository.findOneBy({
          code: categoryDestinationData.code,
        });

      if (!existingCategoryDestination) {
        const newCategoryDestination =
          this.categoryDestinationRepository.create(categoryDestinationData);
        await this.categoryDestinationRepository.save(newCategoryDestination);
        console.log(
          `Category Destination ${categoryDestinationData.name} created successfully.`,
        );
      }
    }
  }

  // seed document categories
  async seedDocumentCategories() {
    const defaultCategories = [
      {
        name: 'Visa',
        slug: 'visa',
        icon: 'passport',
        order_priority: 1,
      },
      {
        name: 'Paspor / Passport',
        slug: 'passport',
        icon: 'book-bookmark',
        order_priority: 2,
      },
      {
        name: 'Legalisasi Dokumen',
        slug: 'legalisation',
        icon: 'file-check',
        order_priority: 3,
      },
      {
        name: 'Penerjemah Tersumpah',
        slug: 'sworn-translator',
        icon: 'languages',
        order_priority: 4,
      },
      {
        name: 'Asuransi Perjalanan',
        slug: 'travel-insurance',
        icon: 'shield-check',
        order_priority: 5,
      },
    ];

    // 1. Ensure all 5 standard categories exist with clean Hashids
    for (const catData of defaultCategories) {
      let existing = await this.documentCategoryRepository.findOne({
        where: { slug: catData.slug },
      });

      // If it exists but has legacy ID (starts with 'cat_'), delete it so it can be re-created with Hashids
      if (existing && existing.id.startsWith('cat_')) {
        await this.documentCategoryRepository.query('SET FOREIGN_KEY_CHECKS = 0');
        await this.documentCategoryRepository.delete(existing.id);
        await this.documentCategoryRepository.query('SET FOREIGN_KEY_CHECKS = 1');
        existing = null;
      }

      if (!existing) {
        const newCategory = this.documentCategoryRepository.create({
          name: catData.name,
          slug: catData.slug,
          icon: catData.icon,
          order_priority: catData.order_priority,
          is_active: true,
        });
        await this.documentCategoryRepository.save(newCategory);
      }
    }

    // 2. Clean up any remaining legacy test records ('cat_%', duplicate 'legalization', 'translation', or tmp slugs)
    try {
      await this.documentCategoryRepository.query('SET FOREIGN_KEY_CHECKS = 0');
      const visaCat = await this.documentCategoryRepository.findOne({
        where: { slug: 'visa' },
      });
      if (visaCat) {
        await this.documentCategoryRepository
          .query(
            `
          UPDATE documents_visa SET category_id = ? 
          WHERE category_id LIKE 'cat_%' OR category_id NOT IN (SELECT id FROM document_categories)
        `,
            [visaCat.id],
          )
          .catch(() => {});
      }
      await this.documentCategoryRepository.query(`
        DELETE FROM document_categories 
        WHERE id LIKE 'cat_%' 
           OR slug LIKE '%_tmp_%' 
           OR slug IN ('translation', 'legalization')
      `);
      await this.documentCategoryRepository.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      await this.documentCategoryRepository
        .query('SET FOREIGN_KEY_CHECKS = 1')
        .catch(() => {});
    }
  }

  // seed motor brands (merek motor)
  async seedMotorBrands() {
    const defaultMotorBrands = [
      'Honda',
      'Yamaha',
      'Kawasaki',
      'Suzuki',
      'Vespa',
      'BMW',
      'Ducati',
      'Royal Enfield',
      'KTM',
    ];

    for (const brandName of defaultMotorBrands) {
      const existingBrand = await this.merekRepository.findOneBy({
        name_merek: brandName,
      });

      if (!existingBrand) {
        const newBrand = this.merekRepository.create({
          name_merek: brandName,
        });
        await this.merekRepository.save(newBrand);
        console.log(`Motor Brand ${brandName} created successfully.`);
      }
    }
  }

  // seed motors with Unsplash thumbnails, translations (id, en, tr), variants, and USD prices
  async seedMotors() {
    const existingMotorsCount = await this.motorRepository.count();
    if (existingMotorsCount > 0) {
      console.log('Motors already seeded, skipping motor seed.');
      return;
    }

    const [yamahaBrand, vespaBrand, hondaBrand, kawasakiBrand] = await Promise.all([
      this.merekRepository.findOneBy({ name_merek: 'Yamaha' }),
      this.merekRepository.findOneBy({ name_merek: 'Vespa' }),
      this.merekRepository.findOneBy({ name_merek: 'Honda' }),
      this.merekRepository.findOneBy({ name_merek: 'Kawasaki' }),
    ]);

    const stateBali = await this.stateRepository.findOne({
      where: { name: 'Bali' },
      relations: ['country'],
    });

    if (!yamahaBrand || !stateBali) {
      console.log('Required brand or state not found for seeding motors, skipping.');
      return;
    }

    const defaultMotors = [
      {
        merek: yamahaBrand,
        state: stateBali,
        country: stateBali.country,
        engine_cc: 155,
        thumbnail: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
        is_available: true,
        translations: [
          {
            language_code: 'id',
            name_motor: 'Yamaha NMAX 155cc',
            description: 'Motor matic premium yang nyaman untuk touring dan keliling pulau Bali.',
          },
          {
            language_code: 'en',
            name_motor: 'Yamaha NMAX 155cc',
            description: 'Comfortable premium scooter ideal for touring around Bali.',
          },
          {
            language_code: 'tr',
            name_motor: 'Yamaha NMAX 155cc',
            description: 'Bali adasında gezmek ve tur yapmak için ideal konforlu premium skuter.',
          },
        ],
        variants: [{ color: 'Matte Black' }, { color: 'Prestige Silver' }],
        prices: [
          { price_type: PriceType.DAILY, price: 10.0 },
          { price_type: PriceType.WEEKLY, price: 60.0 },
        ],
      },
      {
        merek: vespaBrand || yamahaBrand,
        state: stateBali,
        country: stateBali.country,
        engine_cc: 150,
        thumbnail: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80',
        is_available: true,
        translations: [
          {
            language_code: 'id',
            name_motor: 'Vespa Primavera 150cc',
            description: 'Skuter ikonik bergaya klasik Italia yang stylish untuk menikmati keindahan kota.',
          },
          {
            language_code: 'en',
            name_motor: 'Vespa Primavera 150cc',
            description: 'Iconic Italian classic-style scooter perfect for stylish city cruising.',
          },
          {
            language_code: 'tr',
            name_motor: 'Vespa Primavera 150cc',
            description: 'Şehirde şık bir sürüş için mükemmel ikonik İtalyan klasik tarzı skuter.',
          },
        ],
        variants: [{ color: 'White Innocenza' }, { color: 'Red Passione' }],
        prices: [
          { price_type: PriceType.DAILY, price: 15.0 },
          { price_type: PriceType.WEEKLY, price: 90.0 },
        ],
      },
      {
        merek: hondaBrand || yamahaBrand,
        state: stateBali,
        country: stateBali.country,
        engine_cc: 160,
        thumbnail: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
        is_available: true,
        translations: [
          {
            language_code: 'id',
            name_motor: 'Honda PCX 160cc',
            description: 'Motor matic mewah berteknologi tinggi dengan kenyamanan berkendara terbaik.',
          },
          {
            language_code: 'en',
            name_motor: 'Honda PCX 160cc',
            description: 'High-tech luxury scooter with top-tier riding comfort.',
          },
          {
            language_code: 'tr',
            name_motor: 'Honda PCX 160cc',
            description: 'Üst düzey sürüş konforuna sahip yüksek teknolojili lüks skuter.',
          },
        ],
        variants: [{ color: 'Wonderful White' }, { color: 'Brilliant Black' }],
        prices: [
          { price_type: PriceType.DAILY, price: 12.0 },
          { price_type: PriceType.WEEKLY, price: 72.0 },
        ],
      },
    ];

    for (const motorData of defaultMotors) {
      const { translations, variants, prices, ...baseData } = motorData;
      const motorEntity = this.motorRepository.create(baseData);
      const savedMotor = await this.motorRepository.save(motorEntity);

      const transEntities = translations.map((t) =>
        this.translationRepository.create({
          ...t,
          motor: savedMotor,
          slug: this.generateSlug(t.name_motor),
        }),
      );
      await this.translationRepository.save(transEntities);

      const varEntities = variants.map((v) =>
        this.variantRepository.create({
          ...v,
          motor: savedMotor,
        }),
      );
      await this.variantRepository.save(varEntities);

      const priceEntities = prices.map((p) =>
        this.priceRepository.create({
          ...p,
          motor: savedMotor,
        }),
      );
      await this.priceRepository.save(priceEntities);

      console.log(`Motor ${translations[0].name_motor} seeded successfully with Unsplash thumbnail.`);
    }
  }
}
