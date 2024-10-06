# API

## Информация

Сервис предоставляет API, который настраивается в секции файла настройки **api**. API доступно по протоколу HTTP.

### Примеры применения

проверить доступность сервера: `curl -i http://localhost:3001/api/healthcheck`

### API информации сервиса

| URL | Метод | Код | Описание | Пример ответа/запроса |
| ----- | ----- | ----- | ----- | ----- |
| /_ping | GET | 200 | проверить здоровье сервиса | OK |
| /healthcheck | GET | 200 | проверить здоровье сервиса | OK |
| /healthcheck/liveness | GET | 200 | проверить здоровье сервиса | OK |
| /healthcheck/readiness | GET | 200 | проверить готовность сервиса | OK |
| /healthcheck/status | GET | 200 | получить статус здоровья | [пример](#v1_status) |
| /v1/namespaces | POST | 200 | получить список пространств имён | [пример](#v1_namespaces) |
| /v1/auth | POST | 200 | авторизация | [пример](#v1_auth) |
| /v1/logoff | POST | 200 | удалить сессию | [пример](#v1_logoff) |
| /v1/namespace/search | POST | 200 | получить список файлов | [пример](#v1_namespace_search) |
| /v1/namespace/body | POST | 200 | получить содержимое файлов | [пример](#v1_namespace_body) |
| /v1/namespace/key | POST | 200 | получить ключ из файла | [пример](#v1_namespace_key) |
| /v1/store/key | POST | 200 | получить значение ключа из хранилища | [пример](#v1_store_key) |

## Примеры ответов/запросов

### Базовый ответ провала

Этот ответ возвращается при отказе выполнения запроса. Пример:

```js
{
    "status": "fail",
    "message": "Причина отказа"
}
```

### Базовый ответ ошибки

Этот ответ возвращается при ошибке на сервере. Пример:

```js
{
    "status": "error",
    "message": "Причина ошибки"
}
```

### <a name="v1_status"></a> Получить статус здоровья: /healthcheck/status

**Тело ответа**

```js
{
    "status": "success",
    "data": {
        "health": true,
        "apps": {
            "http-to-file": {
                "name": "http-to-file",
                "description": "",
                "health": true
            }
        }
    }
}
```

### <a name="v1_namespaces"></a> Получить список пространств имён: /v1/namespaces

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762" // токен сессии
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": [
        "namespace-1",
        "namespace-2"
    ]
}
```

### <a name="v1_auth"></a> Авторизация: /v1/auth

**Тело запроса**

```js
{
    "auth": {                               // настройка авторизации
        "private_token": "secret token"     // секретный токен
    },
    "client": {                 // данные клиента
        "name": "service-1",    // имя сервиса
        "group": "group-1"      // группа сервиса 
    },
    "settings": {},             // настройки клиента
    "properties": {             // свойства клиента
        "key1": "prop_key1-value",
        "key2": "prop_key2-value"
    }
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": {
        "session_token": "secret-token"
    }
}
```

### <a name="v1_logoff"></a> Удалить сессию: /v1/logoff

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762" // токен сессии
}
```

**Тело ответа**

```js
{
    "status": "success"
}
```

### <a name="v1_namespace_search"></a> Получить список файлов: /v1/namespace/search

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762", // токен сессии
    "pattern": "configs/folder"                              // паттерн поиска
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": [
        {
            "path": "file-1",
            "hash": "hash-1"
        },
        {
            "path": "file-2",
            "hash": "hash-2"
        }
    ]
}
```

### <a name="v1_namespace_body"></a> Получить содержимое файлов: /v1/namespace/body

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762", // токен сессии
    "path": "configs/folder/file1.toml"                      // ссылка на файл
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": {
        "path": "file-1",
        "hash": "hash-1",
        "body": "body-1"
    }
}
```

### <a name="v1_namespace_key"></a> Получить ключ из файла: /v1/namespace/key

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762", // токен сессии
    "path": "configs/folder/file1.toml"                      // ссылка на файл
    "key": "store.key-1"                                     // название ключа
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": {
        "path": "file-1",
        "hash": "hash-1",
        "name": "store.key-1",
        "value": "key value"
    }
}
```

### <a name="v1_store_key"></a> получить значение ключа из хранилища: /v1/store/key

**Тело запроса**

```js
{
    "session_token": "5a7b316f-cb03-453d-861d-d935cc128762",    // токен сессии
    "store": "store_name"                                       // имя хранилища
    "key": "starter.key-1"                                      // название ключа
}
```

**Тело ответа**

```js
{
    "status": "success",
    "data": {
        "store": "store_name",
        "key": "starter.key-1",
        "value": "key value"
    }
}
```
