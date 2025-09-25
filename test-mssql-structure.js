const sql = require('mssql');

// Конфигурация подключения к MSSQL
const config = {
    server: 'localhost', // Замените на ваш сервер
    database: 'your_database', // Замените на вашу базу
    user: 'your_username', // Замените на вашего пользователя
    password: 'your_password', // Замените на ваш пароль
    options: {
        encrypt: false, // Используйте true для Azure
        trustServerCertificate: true
    }
};

async function analyzeMssqlStructure() {
    try {
        console.log('🔌 Подключение к MSSQL базе данных...');
        await sql.connect(config);
        console.log('✅ Подключение успешно!');

        // 1. Получение списка всех таблиц
        console.log('\n📋 Получение списка всех таблиц...');
        const tablesResult = await sql.query(`
            SELECT 
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo'
            ORDER BY TABLE_NAME
        `);
        
        console.log(`Найдено таблиц: ${tablesResult.recordset.length}`);
        console.log('Первые 20 таблиц:');
        tablesResult.recordset.slice(0, 20).forEach(table => {
            console.log(`  - ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
        });

        // 2. Поиск таблиц метаданных
        console.log('\n🔍 Поиск таблиц метаданных...');
        const metadataResult = await sql.query(`
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'dbo'
                AND (TABLE_NAME LIKE '%Metadata%' 
                     OR TABLE_NAME LIKE '%Config%'
                     OR TABLE_NAME LIKE '%Schema%'
                     OR TABLE_NAME LIKE '%Field%'
                     OR TABLE_NAME LIKE '%Object%')
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `);
        
        if (metadataResult.recordset.length > 0) {
            console.log('Найдены таблицы метаданных:');
            metadataResult.recordset.forEach(table => {
                console.log(`  - ${table.TABLE_NAME}.${table.COLUMN_NAME} (${table.DATA_TYPE})`);
            });
        } else {
            console.log('Таблицы метаданных не найдены по стандартным названиям');
        }

        // 3. Анализ справочников
        console.log('\n📚 Анализ справочников...');
        const referenceTables = tablesResult.recordset
            .filter(table => table.TABLE_NAME.startsWith('_Reference'))
            .slice(0, 5); // Берем первые 5 справочников

        for (const table of referenceTables) {
            console.log(`\n--- Анализ таблицы ${table.TABLE_NAME} ---`);
            
            try {
                // Получаем структуру таблицы
                const structureResult = await sql.query(`
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE,
                        CHARACTER_MAXIMUM_LENGTH
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = 'dbo' 
                        AND TABLE_NAME = '${table.TABLE_NAME}'
                    ORDER BY ORDINAL_POSITION
                `);
                
                console.log('Структура:');
                structureResult.recordset.forEach(col => {
                    console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
                });

                // Получаем первые 3 записи
                const dataResult = await sql.query(`
                    SELECT TOP 3 * FROM dbo.${table.TABLE_NAME}
                `);
                
                console.log(`Данные (${dataResult.recordset.length} записей):`);
                dataResult.recordset.forEach((record, index) => {
                    console.log(`  Запись ${index + 1}:`);
                    Object.keys(record).forEach(key => {
                        const value = record[key];
                        if (value !== null && value !== undefined) {
                            if (Buffer.isBuffer(value)) {
                                console.log(`    ${key}: [BINARY DATA]`);
                            } else if (typeof value === 'string' && value.length > 100) {
                                console.log(`    ${key}: "${value.substring(0, 100)}..."`);
                            } else {
                                console.log(`    ${key}: ${value}`);
                            }
                        }
                    });
                });
            } catch (error) {
                console.log(`❌ Ошибка при анализе ${table.TABLE_NAME}: ${error.message}`);
            }
        }

        // 4. Анализ документов
        console.log('\n📄 Анализ документов...');
        const documentTables = tablesResult.recordset
            .filter(table => table.TABLE_NAME.startsWith('_Document'))
            .slice(0, 3); // Берем первые 3 документа

        for (const table of documentTables) {
            console.log(`\n--- Анализ таблицы ${table.TABLE_NAME} ---`);
            
            try {
                // Получаем структуру таблицы
                const structureResult = await sql.query(`
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE,
                        CHARACTER_MAXIMUM_LENGTH
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = 'dbo' 
                        AND TABLE_NAME = '${table.TABLE_NAME}'
                    ORDER BY ORDINAL_POSITION
                `);
                
                console.log('Структура:');
                structureResult.recordset.forEach(col => {
                    console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
                });

                // Получаем первые 2 записи
                const dataResult = await sql.query(`
                    SELECT TOP 2 * FROM dbo.${table.TABLE_NAME}
                `);
                
                console.log(`Данные (${dataResult.recordset.length} записей):`);
                dataResult.recordset.forEach((record, index) => {
                    console.log(`  Запись ${index + 1}:`);
                    Object.keys(record).forEach(key => {
                        const value = record[key];
                        if (value !== null && value !== undefined) {
                            if (Buffer.isBuffer(value)) {
                                console.log(`    ${key}: [BINARY DATA]`);
                            } else if (typeof value === 'string' && value.length > 100) {
                                console.log(`    ${key}: "${value.substring(0, 100)}..."`);
                            } else {
                                console.log(`    ${key}: ${value}`);
                            }
                        }
                    });
                });
            } catch (error) {
                console.log(`❌ Ошибка при анализе ${table.TABLE_NAME}: ${error.message}`);
            }
        }

        // 5. Поиск таблиц с описаниями
        console.log('\n🔍 Поиск таблиц с описаниями полей...');
        const descriptionResult = await sql.query(`
            SELECT 
                TABLE_NAME,
                COUNT(*) as COLUMN_COUNT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'dbo'
                AND (COLUMN_NAME LIKE '%Name%' 
                     OR COLUMN_NAME LIKE '%Description%'
                     OR COLUMN_NAME LIKE '%Title%'
                     OR COLUMN_NAME LIKE '%Code%')
            GROUP BY TABLE_NAME
            ORDER BY COLUMN_COUNT DESC
        `);
        
        console.log('Таблицы с описательными полями:');
        descriptionResult.recordset.slice(0, 10).forEach(table => {
            console.log(`  - ${table.TABLE_NAME}: ${table.COLUMN_COUNT} описательных полей`);
        });

        // 6. Анализ полей _Fld*
        console.log('\n🔧 Анализ полей _Fld*...');
        const fldResult = await sql.query(`
            SELECT 
                TABLE_NAME,
                COUNT(*) as FLD_COUNT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'dbo'
                AND COLUMN_NAME LIKE '_Fld%'
            GROUP BY TABLE_NAME
            ORDER BY FLD_COUNT DESC
        `);
        
        console.log('Таблицы с полями _Fld*:');
        fldResult.recordset.slice(0, 10).forEach(table => {
            console.log(`  - ${table.TABLE_NAME}: ${table.FLD_COUNT} полей _Fld*`);
        });

        console.log('\n✅ Анализ завершен!');

    } catch (error) {
        console.error('❌ Ошибка при анализе:', error.message);
    } finally {
        await sql.close();
        console.log('🔌 Соединение закрыто');
    }
}

// Запуск анализа
if (require.main === module) {
    analyzeMssqlStructure().catch(console.error);
}

module.exports = { analyzeMssqlStructure };
