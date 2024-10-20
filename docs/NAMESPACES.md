# Хранилище конфигураций

## Информация

Хранилище конфигураций указываются в файле конфигурации, как объект массива ключа `namespaces`.

## Оглавление

- [File-system](#fs)
- [Git](#git)
- [Git-crypt](#git-crypt)
- **Consul** в разработке
- **Vault** в разработке

## Общие переменные среды

- CCS_KEY_STORE_<имя хранилища>_ENABLE
- CCS_KEY_STORE_<имя хранилища>_DESCRIPTION
- CCS_KEY_STORE_<имя хранилища>_SOURCE_TYPE

## <a name="fs"></a> File-system хранилище

Хранилище считывает файлы в указанной папке.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]
    name = "env-key-store"
    enable = true
    [key_stores.source]
        type = "env"
        key_prefix = "CCS_ENV_KEY_STORE_"

[[namespaces]]
    name = "fs-namespace"           # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    links = []                      # массив названий подключаемых хранилищ ключей
    [namespaces.source]
        type = "fs"                 # тип источника
        include_regexp = [".*"]     # файлы будут включены в поиск        
        exclude_regexp = []         # файлы будут исключены из поиска
        path = ""                   # путь до папки с файлами
        size = "200kb"              # максимальный размер файла
        [namespaces.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона
```

### Дополнительные переменные среды

- CCS_KEY_STORE_<имя хранилища>_SOURCE_INCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_EXCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_SIZE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_PATH
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_ENABLE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_INTERVAL
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_TIME_ZONE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_JITTER

## <a name="git"></a> Git хранилище

Хранилище считывает файлы в указанном git репозитории.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]
    name = "env-key-store"
    enable = true
    [key_stores.source]
        type = "env"
        key_prefix = "CCS_ENV_KEY_STORE_"

[[namespaces]]
    name = "git-namespace"          # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    links = []                      # массив названий подключаемых хранилищ ключей
    [namespaces.source]
        type = "git"                                                    # тип источника
        include_regexp = [".*"]                                         # файлы будут включены в поиск        
        exclude_regexp = ["\\.md$"]                                     # файлы будут исключены из поиска
        tmp = "tmp"                                                     # временная папка
        size = "200kb"                                                  # максимальный размер файла
        commit_count = 10                                               # количество хранимых коммитов
        repository = "https://user:password@localhost/repository.git"   # репозиторий
        branch = "main"                                                 # ветка репозитория
        [namespaces.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона
```

### Дополнительные переменные среды

- CCS_KEY_STORE_<имя хранилища>_SOURCE_INCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_EXCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_SIZE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_TMP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_COMMIT_COUNT
- CCS_KEY_STORE_<имя хранилища>_SOURCE_REPOSITORY
- CCS_KEY_STORE_<имя хранилища>_SOURCE_BRANCH
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_ENABLE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_INTERVAL
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_TIME_ZONE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_JITTER

## <a name="git-crypt"></a> Git-crypt хранилище

Хранилище считывает файлы в указанном git репозитории зашифрованные колючём git-crypt.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]
    name = "env-key-store"
    enable = true
    [key_stores.source]
        type = "env"
        key_prefix = "CCS_ENV_KEY_STORE_"

[[namespaces]]
    name = "git-namespace"          # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    links = []                      # массив названий подключаемых хранилищ ключей
    [namespaces.source]
        type = "git-crypt"                                              # тип источника
        include_regexp = [".*"]                                         # файлы будут включены в поиск        
        exclude_regexp = ["\\.md$"]                                     # файлы будут исключены из поиска
        tmp = "tmp"                                                     # временная папка
        size = "200kb"                                                  # максимальный размер файла
        commit_count = 10                                               # количество хранимых коммитов
        repository = "https://user:password@localhost/repository.git"   # репозиторий
        branch = "main"                                                 # ветка репозитория
        crypt_key_path = ""                                             # путь к ключу репозитория
        [namespaces.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона
```

### Дополнительные переменные среды

- CCS_KEY_STORE_<имя хранилища>_SOURCE_INCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_EXCLUDE_REGEXP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_SIZE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_TMP
- CCS_KEY_STORE_<имя хранилища>_SOURCE_COMMIT_COUNT
- CCS_KEY_STORE_<имя хранилища>_SOURCE_REPOSITORY
- CCS_KEY_STORE_<имя хранилища>_SOURCE_BRANCH
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_ENABLE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_INTERVAL
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_TIME_ZONE
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRON_JITTER
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CRYPT_KEY_PATH
