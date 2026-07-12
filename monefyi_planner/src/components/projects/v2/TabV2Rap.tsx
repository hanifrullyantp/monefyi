import { useEffect, useState } from 'react';
import RapEditableTable from '../RapEditableTable';
import type { RapItem } from '../../../services/rapService';
import type { RapActualAgg } from '../../../services/costService';
import { loadMaterials } from '../../../services/rpp/materialService';
import { useAppStore } from '../../../store/appStore';

type Props = {
  projectId: string;
  rapItems: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  onRefresh: () => Promise<void>;
  userId: string;
};

export default function TabV2Rap({ projectId, rapItems, rapActuals, onRefresh, userId }: Props) {
  const { tenant, migrationFlags } = useAppStore();
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!migrationFlags.database_master || !tenant?.id) return;
    loadMaterials(tenant.id)
      .then(rows => setMaterialSuggestions(rows.map(r => r.name)))
      .catch(() => setMaterialSuggestions([]));
  }, [migrationFlags.database_master, tenant?.id]);

  return (
    <RapEditableTable
      projectId={projectId}
      items={rapItems}
      rapActuals={rapActuals}
      mode="planning"
      canManage
      recordedBy={userId}
      onRefresh={onRefresh}
      materialSuggestions={materialSuggestions}
    />
  );
}
