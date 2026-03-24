'use client';

import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { SectionCard } from './SectionCard';

interface PlaceholderAction {
  title: string;
  description: string;
  action: ReactNode;
}

interface FeaturePlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  actions?: ReactNode;
  relatedTitle?: string;
  relatedDescription?: string;
  relatedActions?: PlaceholderAction[];
}

export function FeaturePlaceholderPage({
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  actions,
  relatedTitle = 'Recommended next steps',
  relatedDescription = 'Continue adjacent workstreams while this capability is being completed.',
  relatedActions = [],
}: FeaturePlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <SectionCard eyebrow="Availability" title="Planned capability" description="This screen is reserved for the final product workflow and already aligned to the shared page system.">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </SectionCard>
      {relatedActions.length > 0 ? (
        <SectionCard eyebrow="Continue Work" title={relatedTitle} description={relatedDescription}>
          <div className="grid gap-3 md:grid-cols-2">
            {relatedActions.map((item) => (
              <div key={item.title} className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                <div className="mt-4">{item.action}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
