#!/bin/bash
# Script to fix the migration issue

echo "Checking database state..."

# Check if status column exists
docker-compose exec -T db psql -U mzansi -d mzansiserve -c "\d shop_products" | grep -q "status"

if [ $? -eq 0 ]; then
    echo "Status column exists. Checking if it's nullable..."
    
    # Check if column is nullable
    NULLABLE=$(docker-compose exec -T db psql -U mzansi -d mzansiserve -t -c "SELECT is_nullable FROM information_schema.columns WHERE table_name='shop_products' AND column_name='status';" | tr -d ' ')
    
    if [ "$NULLABLE" = "YES" ]; then
        echo "Column exists and is nullable. Updating existing rows and making it NOT NULL..."
        docker-compose exec -T db psql -U mzansi -d mzansiserve -c "UPDATE shop_products SET status = 'active' WHERE status IS NULL;"
        docker-compose exec -T db psql -U mzansi -d mzansiserve -c "ALTER TABLE shop_products ALTER COLUMN status SET NOT NULL;"
        echo "Status column fixed!"
    else
        echo "Column exists and is already NOT NULL. Migration may have partially completed."
    fi
else
    echo "Status column does not exist. Migration should run normally."
fi

echo "Done!"

