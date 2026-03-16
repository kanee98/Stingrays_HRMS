import type { NextRequest } from 'next/server';
import { proxySuperAdminRequest } from '@/app/lib/server/adminProxy';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildUpstreamPath(path: string[] | undefined): string {
  const suffix = path?.filter(Boolean).join('/');
  return suffix ? `/api/${suffix}` : '/api';
}

async function handleRequest(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxySuperAdminRequest(request, buildUpstreamPath(path));
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
