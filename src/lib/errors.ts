export class AuthorizationError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthRequiredError extends Error {
  constructor(message = "AUTH_REQUIRED") {
    super(message);
    this.name = "AuthRequiredError";
  }
}
