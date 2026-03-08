export class AccessDeniedError extends Error {
  constructor() {
    super('Access denied');
  }
}

export class RevisionConflictError extends Error {
  constructor() {
    super('Revision conflict');
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
  }
}

export class UserLookupError extends Error {
  constructor(message = 'User not found') {
    super(message);
  }
}

export class InvalidStateError extends Error {
  constructor(message = 'Invalid state transition') {
    super(message);
  }
}
