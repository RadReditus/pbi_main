const sql = require('mssql');

// Простой тест подключения к MSSQL
async function testMssqlConnection() {
    console.log('🧪 Тестирование подключения к MSSQL...');
    
    // Конфигурация из настроек приложения
    const config = {
        server: process.env.MSSQL_SERVER || 'localhost',
        database: process.env.MSSQL_DATABASE || 'test_db',
        user: process.env.MSSQL_USER || 'sa',
        password: process.env.MSSQL_PASSWORD || 'password',
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        console.log(`Подключение к серверу: ${config.server}`);
        console.log(`База данных: ${config.database}`);
        
        await sql.connect(config);
        console.log('✅ Подключение успешно!');

        // Простой тест запроса
        const result = await sql.query('SELECT @@VERSION as version');
        console.log('Версия SQL Server:', result.recordset[0].version);

        // Получение списка таблиц
        const tablesResult = await sql.query(`
            SELECT TOP 10 
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo'
            ORDER BY TABLE_NAME
        `);
        
        console.log('\nПервые 10 таблиц:');
        tablesResult.recordset.forEach(table => {
            console.log(`  - ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
        });

        console.log('\n✅ Тест подключения завершен успешно!');

    } catch (error) {
        console.error('❌ Ошибка подключения:', error.message);
        console.error('Проверьте настройки подключения в .env файле');
    } finally {
        await sql.close();
        console.log('🔌 Соединение закрыто');
    }
}

// Запуск теста
if (require.main === module) {
    testMssqlConnection().catch(console.error);
}

module.exports = { testMssqlConnection };
