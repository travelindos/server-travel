-- ==============================================================================
-- Database Migration Script: Move Thumbnail & Images from Translations to Destinations
-- Target DB: MySQL
-- Run this script BEFORE deploying the new backend code to production.
-- ==============================================================================

-- Step 1: Ensure new columns exist on 'destinations' table
ALTER TABLE `destinations` 
  ADD COLUMN IF NOT EXISTS `thumbnail` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `images` JSON NULL;

-- Step 2: Migrate data from 'destination_translations' to 'destinations'
-- Note: Copies thumbnail and image from the first non-null translation record per destination
UPDATE `destinations` d
INNER JOIN (
    SELECT 
        `destination_id`, 
        MAX(`thumbnail`) AS `thumbnail`, 
        MAX(`image`) AS `images`
    FROM `destination_translations`
    WHERE `thumbnail` IS NOT NULL OR `image` IS NOT NULL
    GROUP BY `destination_id`
) dt ON d.`id` = dt.`destination_id`
SET 
    d.`thumbnail` = dt.`thumbnail`,
    d.`images` = dt.`images`;

-- Step 3: Drop old duplicate columns from 'destination_translations' table
ALTER TABLE `destination_translations`
  DROP COLUMN IF EXISTS `thumbnail`,
  DROP COLUMN IF EXISTS `image`;

-- Verification Query (Check migrated data)
SELECT `id`, `price`, `thumbnail`, `images` FROM `destinations`;
