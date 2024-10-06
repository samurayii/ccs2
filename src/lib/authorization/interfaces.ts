export interface IAuthorizationConfig {
    tokens: string[]
}

export interface IAuthorization {
    check: (token: string) => Promise<boolean>
}