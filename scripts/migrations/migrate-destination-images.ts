import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development' });

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 3306,
  username: process.env.DATABASE_USER || 'traveldb',
  password: process.env.DATABASE_PASSWORD || 'traveldb',
  database: process.env.DATABASE_NAME || 'travel_db',
  synchronize: false,
  logging: true,
});

async function runMigration() {
  console.log('🚀 Starting Destination Images & Thumbnail Migration...');
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to Database.');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Add columns to destinations if they don't exist
      console.log('Step 1: Adding thumbnail and images columns to destinations table...');
      await queryRunner.query(`
        ALTER TABLE \`destinations\` 
        ADD COLUMN IF NOT EXISTS \`thumbnail\` VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS \`images\` JSON NULL;
      `);

      // 2. Migrate data from destination_translations to destinations
      console.log('Step 2: Copying existing images and thumbnail data...');
      const result = await queryRunner.query(`
        UPDATE \`destinations\` d
        INNER JOIN (
            SELECT 
                \`destination_id\`, 
                MAX(\`thumbnail\`) AS \`thumbnail\`, 
                MAX(\`image\`) AS \`images\`
            FROM \`destination_translations\`
            WHERE \`thumbnail\` IS NOT NULL OR \`image\` IS NOT NULL
            GROUP BY \`destination_id\`
        ) dt ON d.\`id\` = dt.\`destination_id\`
        SET 
            d.\`thumbnail\` = dt.\`thumbnail\`,
            d.\`images\` = dt.\`images\`;
      `);
      console.log(`✅ Data migrated successfully:`, result);

      // 3. Drop old columns from destination_translations
      console.log('Step 3: Dropping old thumbnail and image columns from destination_translations...');
      await queryRunner.query(`
        ALTER TABLE \`destination_translations\`
        DROP COLUMN IF EXISTS \`thumbnail\`,
        DROP COLUMN IF EXISTS \`image\`;
      `);

      await queryRunner.commitTransaction();
      console.log('🎉 Migration finished successfully!');
    } catch (err) {
      console.error('❌ Migration failed, rolling back transaction:', err);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

runMigration();
