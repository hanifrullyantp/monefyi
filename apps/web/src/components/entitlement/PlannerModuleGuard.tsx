import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useEntitlement } from '../../hooks/useEntitlement';
import {
  canAccessPlannerNavModule,
  isAdminFullAccess,
  plannerNavModuleLabel,
  type PlannerNavModule,
} from '../../lib/entitlement';
import { promptPlannerUpgrade } from '../../lib/upgradePrompt';

type Props = {
  module: PlannerNavModule;
  children: ReactNode;
};

export default function PlannerModuleGuard({ module, children }: Props) {
  const navigate = useNavigate();
  const { platformRole, user, entitlementPreviewMode } = useAppStore();
  const entitlement = useEntitlement();
  const adminFullAccess = isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode);
  const allowed = adminFullAccess || canAccessPlannerNavModule(entitlement, module);

  useEffect(() => {
    if (entitlement.isLoading || allowed) return;
    navigate('/app?tab=projects', { replace: true });
    promptPlannerUpgrade({
      trigger: 'pro_feature',
      featureName: plannerNavModuleLabel(module),
    });
  }, [allowed, entitlement.isLoading, module, navigate]);

  if (entitlement.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
