-- Step 1: Add uuid column as optional
ALTER TABLE directories ADD COLUMN uuid VARCHAR(255) NULL;

-- Step 2: Generate UUIDs for existing records
UPDATE directories SET uuid = CONCAT('dir_', REPLACE(UUID(), '-', '')) WHERE uuid IS NULL;

-- Step 3: Make uuid column not null
ALTER TABLE directories MODIFY COLUMN uuid VARCHAR(255) NOT NULL;

-- Step 4: Drop the current primary key
ALTER TABLE directories DROP PRIMARY KEY;

-- Step 5: Add uuid as the new primary key
ALTER TABLE directories ADD PRIMARY KEY (uuid);

-- Step 6: Add index on id for faster lookups
ALTER TABLE directories ADD INDEX idx_directories_id (id);

-- Step 7: Verify the changes
SELECT COUNT(*) as total_records, COUNT(uuid) as uuid_not_null FROM directories;
