import { useEffect } from 'react';
import { useToast } from '@astryxdesign/core/Toast';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';
import { ignoreRefusal } from '../refusal.js';

export function useUpdateApplied(): void {
  const showToast = useToast();
  useEffect(() => {
    void studio().updateApplied().then((applied) => {
      if (applied === null) return;
      showToast({ body: t('update.applied', { version: applied.version }), type: 'info', uniqueID: `update-applied-${applied.version}` });
    }, ignoreRefusal('update', 'update applied'));
  }, [showToast]);
}
