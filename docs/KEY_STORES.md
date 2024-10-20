# Хранилище ключей

## Информация

Хранилище ключей указываются в файле конфигурации, как объект массива ключа `key_stores`.

## Оглавление

- [Environment](#env)
- [File-system](#fs)
- [Git](#git)
- [Git-crypt](#git-crypt)
- **Consul** в разработке
- [Vault](#git-vault)

## Общие переменные среды

- CCS_KEY_STORE_<имя хранилища>_ENABLE
- CCS_KEY_STORE_<имя хранилища>_DESCRIPTION
- CCS_KEY_STORE_<имя хранилища>_SOURCE_TYPE

## <a name="env"></a> Environment хранилище

Хранилище считывает переменные среды и если они удовлетворяют требованиям префикса, формирует из них ключи. Название ключей формируются из названия переменой в нижнем регистре и с отсечением префикса.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]                              # массив настроек хранилищ ключей
    name = "env-key-store"                  # имя хранилища (должно быть уникальным)
    enable = true                           # активация
    description = ""                        # описание
    [key_stores.source]                     # источник
        type = "env"                        # тип источника
        key_prefix = "CCS_ENV_KEY_STORE_"   # префикс переменных среды

[[namespaces]]
    name = "git-namespace"
    enable = true
    links = []
    [namespaces.source]
        type = "git"
        repository = "https://user:password@server:3000/repository.git"
```

### Дополнительные переменные среды

- CCS_KEY_STORE_<имя хранилища>_SOURCE_KEY_PREFIX

## <a name="fs"></a> File-system хранилище

Хранилище считывает переменные из файлов в указанной папке, файлы должны быть формата json, yaml или toml. Название ключей формируются из названия дочерней папки, файла и ключа файла в нижнем регистре.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]                      # массив настроек хранилищ ключей
    name = "fs-key-store"           # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    [key_stores.source]             # источник
        type = "fs"                 # тип источника
        include_regexp = [".*"]     # файлы будут включены в поиск        
        exclude_regexp = []         # файлы будут исключены из поиска
        path = ""                   # путь до папки с файлами
        size = "200kb"              # максимальный размер файла
        [key_stores.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона

[[namespaces]]
    name = "git-namespace"
    enable = true
    links = []
    [namespaces.source]
        type = "git"
        repository = "https://user:password@server:3000/repository.git"
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

Хранилище считывает переменные из файлов в указанном git репозитории, файлы должны быть формата json, yaml или toml. Название ключей формируются из названия дочерней папки, файла и ключа файла в нижнем регистре.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]                      # массив настроек хранилищ ключей
    name = "git-key-store"          # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    [key_stores.source]                                                 # источник
        type = "git"                                                    # тип источника
        include_regexp = [".*"]                                         # файлы будут включены в поиск        
        exclude_regexp = ["\\.md$"]                                     # файлы будут исключены из поиска
        tmp = "tmp"                                                     # временная папка
        size = "200kb"                                                  # максимальный размер файла
        commit_count = 10                                               # количество хранимых коммитов
        repository = "https://user:password@localhost/repository.git"   # репозиторий
        branch = "main"                                                 # ветка репозитория
        [key_stores.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона

[[namespaces]]
    name = "git-namespace"
    enable = true
    links = []
    [namespaces.source]
        type = "git"
        repository = "https://user:password@server:3000/repository.git"
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

Хранилище считывает переменные из файлов в указанном git репозитории зашифрованные колючём git-crypt, файлы должны быть формата json, yaml или toml. Название ключей формируются из названия дочерней папки, файла и ключа файла в нижнем регистре.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]                      # массив настроек хранилищ ключей
    name = "git-key-store"          # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    [key_stores.source]                                                 # источник
        type = "git-crypt"                                              # тип источника
        include_regexp = [".*"]                                         # файлы будут включены в поиск        
        exclude_regexp = ["\\.md$"]                                     # файлы будут исключены из поиска
        tmp = "tmp"                                                     # временная папка
        size = "200kb"                                                  # максимальный размер файла
        commit_count = 10                                               # количество хранимых коммитов
        repository = "https://user:password@localhost/repository.git"   # репозиторий
        branch = "main"                                                 # ветка репозитория
        crypt_key_path = ""                                             # путь к ключу репозитория
        [key_stores.source.cron]            # настройка обновления
            enable = true                   # активация
            jitter = 3                      # интервал дрожания
            interval = "*/15 * * * * *"     # интервал
            time_zone = "Europe/Moscow"     # временная зона

[[namespaces]]
    name = "git-namespace"
    enable = true
    links = []
    [namespaces.source]
        type = "git"
        repository = "https://user:password@server:3000/repository.git"
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

## <a name="git-vault"></a> Vault хранилище

Хранилище считывает переменные с сервера Vault используя API.

### Пример файла конфигурации config.toml

```toml
[api]
    enable = true

[authorization]
    tokens = ["secret_token"]

[[key_stores]]                      # массив настроек хранилищ ключей
    name = "vault"                  # имя хранилища (должно быть уникальным)
    enable = true                   # активация
    description = ""                # описание
    [key_stores.source]                 # источник
        type = "vault"                  # тип источника
        version = "v1"                  # версия API v1 или v2
        secrets = []                    # доступные хранилища на сервере        
        token = "xxxxxxxxxx"            # токен доступа на сервер
        [key_stores.source.connection]  # настройка подключения
            host = ""                   # хост
            protocol = "https"          # протокол http или https
            port = 8200                 # порт
            path = "/"                  # префикс API 
            timeout = "10s"             # время запроса
        [key_stores.source.refresh]     # настройки проверки секрета
            interval = "20s"            # интервал проверки
            jitter = "5s"               # дрожание интервала

[[namespaces]]
    name = "git-namespace"
    enable = true
    links = []
    [namespaces.source]
        type = "git"
        repository = "https://user:password@server:3000/repository.git"
```

### Дополнительные переменные среды

- CCS_KEY_STORE_<имя хранилища>_SOURCE_VERSION
- CCS_KEY_STORE_<имя хранилища>_SOURCE_SECRETS
- CCS_KEY_STORE_<имя хранилища>_SOURCE_TOKEN
- CCS_KEY_STORE_<имя хранилища>_SOURCE_REFRESH_INTERVAL
- CCS_KEY_STORE_<имя хранилища>_SOURCE_REFRESH_JITTER
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CONNECTION_HOST
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CONNECTION_PROTOCOL
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CONNECTION_PORT
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CONNECTION_PATH
- CCS_KEY_STORE_<имя хранилища>_SOURCE_CONNECTION_TIMEOUT
