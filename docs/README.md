# Central-config-server

## Информация

Сервер центральной системы конфигурации.

## Оглавление

- [Установка](#install)
- [Ключи запуска](#launch)
- [Конфигурация](#configuration)
- [Хранилище конфигураций](NAMESPACES.md)
- [Хранилище ключей](KEY_STORES.md)
- [HTTP API](API.md)
- **SSE** - в разработке
- [Обогащение](ENRICHMENT.md)

## <a name="install"></a> Установка и использование

пример строки запуска: `node /central-config-server/app.js -c config.toml`

## <a name="launch"></a> Таблица ключей запуска
Ключ | Описание
------------ | -------------
--version, -v | вывести номер версии приложения
--help, -h | вызвать справку по ключам запуска
--config, -c | путь к файлу конфигурации в формате toml, json или yaml, (переменная среды: CCS_CONFIG_PATH)

## <a name="configuration"></a> Конфигурация

Программа настраивается через файл конфигурации двух форматов TOML, JSON или YAML. Так же можно настраивать через переменные среды, которые будут считаться первичными.

### Пример файла конфигурации config.toml

```toml
[logger]                    # настройка логгера
    name = ""               # имя логгера
    enable = true           # активация
    level = "error"         # уровень (fatal, error, warn, info, debug, trace)
    timestamp = "none"      # вывод времени full, short, unix и none

[api]
    enable = false              # активация API сервера
    logging = false             # логирование запросов (ключ logger.level = "debug" или ниже)
    hostname = "0.0.0.0"        # хост          
    port = 3001                 # порт
    backlog = 511               # очередь баклога
    prefix = "/api"             # префикс
    connection_timeout = 0      # таймаут сервера в милисекундах
    keep_alive_timeout = 5000   # таймаут keep-alive сервера в милисекундах
    body_limit = "1mb"          # максимальный размер тела запроса (b, kb, mb)
    trust_proxy = false         # доверие proxy закголовку

[gatherer]              # Настройка процесса сборки
    iterations = 3      # количество вложенностей ключей
    thread_count = 5    # количество потоков обработки
    [gatherer.template_engine]      # настройка шаблонизатора
        delimiters = ["{{","}}"]    # разделители

[sessions]      # настройка сессий
    ttl = 600   # время сессии в секундах

[authorization]                 # настройка конфигурации (настройка для типа token)
    tokens = ["secret_token"]   # массив секретных токенов

[[key_stores]]                  # массив настроек хранилищ ключей
    name = "env-key-store"
    enable = false
    [key_stores.source]
        type = "env"
        key_prefix = "CCS_ENV_KEY_STORE_"

[[namespaces]]                  # массив настроек хранилищ файлов конфигурации
    name = "git-namespace"
    enable = false
    links = []
    [namespaces.source]
        type = "git"
        include_regexp = [".*"]
        exclude_regexp = []
        tmp = "tmp"
        commit_count = 10
        repository = "https://user:password@server:3000/repository.git"
        branch = "master"
        size = "200kb"
        [namespaces.source.cron]
            enable = true
            jitter = 3
            interval = "*/10 * * * * *"
            time_zone = "Europe/Moscow"
```

Оригинальный файл [тут](config_example.toml)

### Настройка через переменные среды

Ключи конфигурации можно задать через переменные среды ОС. Имя переменной среды формируется из двух частей, префикса `CCS_` и имени переменной в верхнем реестре. Если переменная вложена, то это обозначается символом `_`. Переменные среды имеют высший приоритет.

пример для переменной **logger.mode**: `CCS_LOGGER_MODE`

пример для переменной **api.ips_count**: `CCS_API_IPS_COUNT`
