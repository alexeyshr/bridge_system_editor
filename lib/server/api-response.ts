import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 201, ...init });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: 'BAD_REQUEST',
      message,
      details,
    },
    { status: 400 },
  );
}

export function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    {
      error: 'UNAUTHORIZED',
      message,
    },
    { status: 401 },
  );
}

export function forbidden(message = 'Access denied') {
  return NextResponse.json(
    {
      error: 'FORBIDDEN',
      message,
    },
    { status: 403 },
  );
}

export function notFound(message = 'Not found') {
  return NextResponse.json(
    {
      error: 'NOT_FOUND',
      message,
    },
    { status: 404 },
  );
}

export function conflict(message: string) {
  return NextResponse.json(
    {
      error: 'CONFLICT',
      message,
    },
    { status: 409 },
  );
}

export function gone(message: string) {
  return NextResponse.json(
    {
      error: 'GONE',
      message,
    },
    { status: 410 },
  );
}

export function serverError(message = 'Unexpected server error') {
  return NextResponse.json(
    {
      error: 'INTERNAL_SERVER_ERROR',
      message,
    },
    { status: 500 },
  );
}
