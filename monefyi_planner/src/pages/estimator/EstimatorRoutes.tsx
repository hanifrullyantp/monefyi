import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import EstimatorList from './EstimatorList';
import EstimatorForm from './EstimatorForm';
import PricelistPage from './PricelistPage';

export default function EstimatorRoutes() {
  const location = useLocation();
  const setActiveTab = useAppStore(s => s.setActiveTab);

  useEffect(() => {
    setActiveTab('estimator');
  }, [location.pathname, setActiveTab]);

  return (
    <Routes>
      <Route index element={<EstimatorList />} />
      <Route path="new" element={<EstimatorForm />} />
      <Route path="pricelist" element={<PricelistPage />} />
      <Route path=":id" element={<EstimatorForm />} />
    </Routes>
  );
}
