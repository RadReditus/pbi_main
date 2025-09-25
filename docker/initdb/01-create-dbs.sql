CREATE DATABASE users_db;
CREATE DATABASE onec_filtered_db;
CREATE DATABASE onec_tagged_db;

-- Создаем базы с поддержкой кириллицы
CREATE DATABASE source_one_c WITH ENCODING 'UTF8' LC_COLLATE='C.utf8' LC_CTYPE='C.utf8' TEMPLATE=template0;
CREATE DATABASE source_1c WITH ENCODING 'UTF8' LC_COLLATE='C.utf8' LC_CTYPE='C.utf8' TEMPLATE=template0;
CREATE DATABASE ptc_reklama WITH ENCODING 'UTF8' LC_COLLATE='C.utf8' LC_CTYPE='C.utf8' TEMPLATE=template0;
