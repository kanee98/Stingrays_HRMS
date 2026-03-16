'use client';

import { useEffect, useState } from 'react';
import { getSuperAdminApiUrl } from './platformUrls';

export type ClientServiceKey = 'hrms' | 'employee-onboarding' | 'payroll' | string;

export interface ClientAccessSection {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  configJson: string | null;
}

export interface ClientAccessService {
  id: number;
  key: ClientServiceKey;
  name: string;
  description: string | null;
  isEnabled: boolean;
  configJson: string | null;
  sections: ClientAccessSection[];
}

export interface ClientAccessSnapshot {
  client: {
    id: number;
    key: string;
    name: string;
    status: string;
  };
  services: ClientAccessService[];
  fetchedAt: string;
}

const FALLBACK_CLIENT_KEY = 'stingrays';

export function getDefaultClientKey(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_CLIENT_KEY || FALLBACK_CLIENT_KEY;
}

export async function fetchClientAccessSnapshot(clientKey = getDefaultClientKey()): Promise<ClientAccessSnapshot> {
  const accessUrl = new URL('/api/public/client-access', getSuperAdminApiUrl());
  accessUrl.searchParams.set('clientKey', clientKey);

  const response = await fetch(accessUrl.toString(), {
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load client access');
  }

  return (await response.json()) as ClientAccessSnapshot;
}

export function getServiceAccess(
  snapshot: ClientAccessSnapshot | null | undefined,
  serviceKey: ClientServiceKey,
): ClientAccessService | null {
  return snapshot?.services.find((service) => service.key === serviceKey) ?? null;
}

export function isServiceEnabled(
  snapshot: ClientAccessSnapshot | null | undefined,
  serviceKey: ClientServiceKey,
): boolean {
  return getServiceAccess(snapshot, serviceKey)?.isEnabled ?? false;
}

export function isSectionEnabled(
  snapshot: ClientAccessSnapshot | null | undefined,
  serviceKey: ClientServiceKey,
  sectionKey: string | null | undefined,
): boolean {
  if (!sectionKey) {
    return true;
  }

  const service = getServiceAccess(snapshot, serviceKey);
  if (!service?.isEnabled) {
    return false;
  }

  const section = service.sections.find((item) => item.key === sectionKey);
  return section?.isEnabled ?? false;
}

export function useClientAccess(clientKey = getDefaultClientKey()) {
  const [snapshot, setSnapshot] = useState<ClientAccessSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    void fetchClientAccessSnapshot(clientKey)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setSnapshot(data);
      })
      .catch((err: unknown) => {
        if (!isActive) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load client access');
        setSnapshot(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [clientKey]);

  return { snapshot, isLoading, error };
}
