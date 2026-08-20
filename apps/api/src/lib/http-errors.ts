/** Contrato de erro único descrito em docs/API.md. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso não encontrado.") {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(422, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Entre com seu usuário para continuar.") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(403, message);
  }
}
